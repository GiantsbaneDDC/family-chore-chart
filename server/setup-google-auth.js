#!/usr/bin/env node
/**
 * setup-google-auth.js
 * One-time script to authorise Calendar + Drive access.
 * Stores refresh token directly in server/.env (no keyring needed).
 * Listens on port 9876 so any browser can complete the flow.
 *
 * Usage: node server/setup-google-auth.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const urlLib = require('url');

const GOG_SECRET_PATH = path.join(process.env.HOME, '.config/gog/client_secret.json');
const ENV_PATH = path.join(__dirname, '.env');
const PORT = 9876;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
].join(' ');

function writeEnvKey(key, value) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
}

function readEnvKey(key) {
  if (!fs.existsSync(ENV_PATH)) return null;
  const match = fs.readFileSync(ENV_PATH, 'utf8').match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function httpsPost(hostname, reqPath, data) {
  return new Promise((resolve, reject) => {
    const body = new urlLib.URLSearchParams(data).toString();
    const req = https.request({
      hostname, path: reqPath, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = ''; res.on('data', d => raw += d); res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function main() {
  console.log('\n🔑 Google Auth Setup (Calendar + Drive)\n');

  // Check if already done
  const existing = readEnvKey('GOOGLE_OAUTH_REFRESH_TOKEN');
  if (existing) {
    console.log('✅ GOOGLE_OAUTH_REFRESH_TOKEN already in .env — already authenticated!\n');
    console.log('   Delete it from server/.env and re-run if you need to re-authenticate.\n');
    process.exit(0);
  }

  if (!fs.existsSync(GOG_SECRET_PATH)) {
    console.error(`❌ Cannot find ${GOG_SECRET_PATH}`);
    process.exit(1);
  }
  const secret = JSON.parse(fs.readFileSync(GOG_SECRET_PATH, 'utf8'));
  const creds = secret.installed || secret.web;
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new urlLib.URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

  console.log('Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nSign in and approve Calendar + Drive access.');
  console.log('After approving, when you get a "can\'t connect" page:');
  console.log('  → Change "localhost" to "192.168.1.4" in the address bar and hit Enter\n');
  console.log('Waiting on port', PORT, '...\n');

  // Try auto-open
  try { execSync(`DISPLAY=:0 xdg-open "${authUrl}" 2>/dev/null || true`); } catch {}

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = new urlLib.URL(req.url, `http://localhost:${PORT}`);
      const code = parsed.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end('<html><body style="font-family:sans-serif;padding:40px;background:#1a1a2e;color:white"><h2>✅ Authorised! Return to your terminal.</h2></body></html>');
        server.close();
        resolve(code);
      } else {
        const err = parsed.searchParams.get('error') || 'unknown';
        res.end(`<html><body><h2>❌ ${err}</h2></body></html>`);
        server.close();
        reject(new Error(err));
      }
    });
    server.listen(PORT, '0.0.0.0');
    server.on('error', reject);
    setTimeout(() => { server.close(); reject(new Error('Timed out')); }, 10 * 60 * 1000);
  });

  console.log('✅ Got auth code — exchanging for tokens...');

  const tokens = await httpsPost('oauth2.googleapis.com', '/token', {
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
  });

  if (tokens.error) {
    console.error('❌ Token exchange failed:', tokens.error_description || tokens.error);
    process.exit(1);
  }

  writeEnvKey('GOOGLE_OAUTH_CLIENT_ID', clientId);
  writeEnvKey('GOOGLE_OAUTH_CLIENT_SECRET', clientSecret);
  writeEnvKey('GOOGLE_OAUTH_REFRESH_TOKEN', tokens.refresh_token);

  console.log('\n✅ Saved to server/.env:');
  console.log('   GOOGLE_OAUTH_CLIENT_ID');
  console.log('   GOOGLE_OAUTH_CLIENT_SECRET');
  console.log('   GOOGLE_OAUTH_REFRESH_TOKEN');
  console.log('\nNow restart: systemctl --user restart chore-chart\n');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
