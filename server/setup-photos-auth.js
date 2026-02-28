#!/usr/bin/env node
/**
 * setup-photos-auth.js
 * One-time script to authorise Google Photos access.
 * Reuses the gog OAuth client credentials.
 * 
 * Run: node server/setup-photos-auth.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const url = require('url');

const GOG_SECRET_PATH = path.join(process.env.HOME, '.config/gog/client_secret.json');
const ENV_PATH = path.join(__dirname, '.env');

const SCOPE = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const REDIRECT_URI = 'http://localhost:9876/callback';

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs.readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

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

function httpsPost(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const body = new url.URLSearchParams(data).toString();
    const req = https.request({ hostname, path, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('\n🌐 Google Photos Auth Setup\n');

  // Load gog client credentials
  if (!fs.existsSync(GOG_SECRET_PATH)) {
    console.error(`❌ Cannot find ${GOG_SECRET_PATH}\n   Run gog first to set up Google credentials.`);
    process.exit(1);
  }
  const secret = JSON.parse(fs.readFileSync(GOG_SECRET_PATH, 'utf8'));
  const creds = secret.installed || secret.web;
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;

  console.log(`✅ Using Google client: ${clientId.split('-')[0]}...`);

  // Check if already configured
  const env = readEnv();
  if (env.GOOGLE_PHOTOS_REFRESH_TOKEN) {
    console.log('⚠️  GOOGLE_PHOTOS_REFRESH_TOKEN already set in .env');
    console.log('   Delete it and re-run if you want to re-authenticate.\n');
    process.exit(0);
  }

  // Build auth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new url.URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

  console.log('\n1️⃣  Open this URL in your browser:\n');
  console.log('   ' + authUrl);
  console.log('\n2️⃣  Sign in and approve access to Google Photos\n');

  // Start local callback server
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = new url.URL(req.url, 'http://localhost:9876');
      const code = parsed.searchParams.get('code');
      const error = parsed.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end('<html><body style="font-family:sans-serif;padding:40px"><h2>✅ Authorised!</h2><p>You can close this tab and return to your terminal.</p></body></html>');
        server.close();
        resolve(code);
      } else {
        res.end(`<html><body><h2>❌ Error: ${error}</h2></body></html>`);
        server.close();
        reject(new Error(error));
      }
    });
    server.listen(9876, () => {
      console.log('⏳ Waiting for Google redirect on http://localhost:9876 ...\n');
      // Try to auto-open browser
      try {
        execSync(`xdg-open "${authUrl}" 2>/dev/null || open "${authUrl}" 2>/dev/null || true`);
      } catch {}
    });
    server.on('error', reject);
    setTimeout(() => { server.close(); reject(new Error('Timed out waiting for auth (5 min)')); }, 5 * 60 * 1000);
  });

  console.log('✅ Got auth code, exchanging for tokens...');

  // Exchange code for tokens
  const tokens = await httpsPost('oauth2.googleapis.com', '/token', {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  if (tokens.error) {
    console.error('❌ Token exchange failed:', tokens.error, tokens.error_description);
    process.exit(1);
  }

  // Save to .env
  writeEnvKey('GOOGLE_PHOTOS_CLIENT_ID', clientId);
  writeEnvKey('GOOGLE_PHOTOS_CLIENT_SECRET', clientSecret);
  writeEnvKey('GOOGLE_PHOTOS_REFRESH_TOKEN', tokens.refresh_token);

  console.log('\n✅ Saved to server/.env:');
  console.log('   GOOGLE_PHOTOS_CLIENT_ID');
  console.log('   GOOGLE_PHOTOS_CLIENT_SECRET');
  console.log('   GOOGLE_PHOTOS_REFRESH_TOKEN');
  console.log('\n3️⃣  Now set GOOGLE_PHOTOS_ALBUM_ID in server/.env');
  console.log('   Get your album ID from the URL when viewing an album in Google Photos:');
  console.log('   https://photos.google.com/album/<ALBUM_ID>');
  console.log('\n   Or set GOOGLE_PHOTOS_ALBUM_ID=_all to use your entire photo library (most recent photos)');
  console.log('\n   Then restart the app: systemctl --user restart chore-chart\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
