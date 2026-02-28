#!/usr/bin/env node
/**
 * setup-photos-auth.js
 * One-time script to authorise Google Photos access.
 * Reuses the gog OAuth client credentials.
 *
 * Usage:
 *   node server/setup-photos-auth.js
 *
 * After running, add GOOGLE_PHOTOS_ALBUM_ID to server/.env and restart.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const urlLib = require('url');

const GOG_SECRET_PATH = path.join(process.env.HOME, '.config/gog/client_secret.json');
const ENV_PATH = path.join(__dirname, '.env');

const SCOPE = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const PORT = 9876;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

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

function httpsPost(hostname, reqPath, data) {
  return new Promise((resolve, reject) => {
    const body = new urlLib.URLSearchParams(data).toString();
    const req = https.request({
      hostname, path: reqPath, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(hostname, reqPath, accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path: reqPath, method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n📸 Google Photos Auth Setup\n');

  if (!fs.existsSync(GOG_SECRET_PATH)) {
    console.error(`❌ Cannot find ${GOG_SECRET_PATH}`);
    process.exit(1);
  }
  const secret = JSON.parse(fs.readFileSync(GOG_SECRET_PATH, 'utf8'));
  const creds = secret.installed || secret.web;
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;

  const env = readEnv();
  if (env.GOOGLE_PHOTOS_REFRESH_TOKEN) {
    console.log('✅ Already authenticated. Testing access token...\n');
    // Just try listing albums
    const tokens = await httpsPost('oauth2.googleapis.com', '/token', {
      client_id: clientId, client_secret: clientSecret,
      refresh_token: env.GOOGLE_PHOTOS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    if (tokens.error) {
      console.error('❌ Refresh token is invalid:', tokens.error_description);
      console.log('   Delete GOOGLE_PHOTOS_REFRESH_TOKEN from server/.env and re-run.\n');
      process.exit(1);
    }
    const at = tokens.access_token;
    const albums = await httpsGet('photoslibrary.googleapis.com', '/v1/albums?pageSize=50', at);
    if (albums.albums) {
      console.log('📚 Your Google Photos albums:\n');
      albums.albums.forEach(a => console.log(`  ${a.title.padEnd(40)} → ${a.id}`));
    }
    console.log('\n✅ Auth is working fine!\n');
    return;
  }

  // Build auth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new urlLib.URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

  console.log('Step 1 — Open this URL in any browser (phone or computer):\n');
  console.log(authUrl);
  console.log('\nStep 2 — Sign in as tinyerinandmatt@gmail.com and approve access.\n');
  console.log('Step 3 — After approving, you\'ll be redirected to a "page not found".');
  console.log('         That\'s fine! Copy the full URL from your browser\'s address bar.\n');
  console.log('Waiting for callback on port ' + PORT + '...\n');

  // Listen for the callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = new urlLib.URL(req.url, `http://localhost:${PORT}`);
      const code = parsed.searchParams.get('code');
      const error = parsed.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end('<html><body style="font-family:sans-serif;padding:40px;background:#1a1a2e;color:white"><h2>✅ Done! Return to your terminal.</h2></body></html>');
        server.close();
        resolve(code);
      } else {
        res.end(`<html><body><h2>❌ ${error}</h2></body></html>`);
        server.close();
        reject(new Error(error));
      }
    });
    server.listen(PORT, '0.0.0.0', () => {
      // Try auto-open on local display
      try { execSync(`DISPLAY=:0 xdg-open "${authUrl}" 2>/dev/null || true`); } catch {}
    });
    server.on('error', reject);
    setTimeout(() => { server.close(); reject(new Error('Timed out (10 min)')); }, 10 * 60 * 1000);
  });

  console.log('\n✅ Got auth code — exchanging for tokens...');

  const tokens = await httpsPost('oauth2.googleapis.com', '/token', {
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
  });

  if (tokens.error) {
    console.error('❌ Token exchange failed:', tokens.error_description || tokens.error);
    process.exit(1);
  }

  writeEnvKey('GOOGLE_PHOTOS_CLIENT_ID', clientId);
  writeEnvKey('GOOGLE_PHOTOS_CLIENT_SECRET', clientSecret);
  writeEnvKey('GOOGLE_PHOTOS_REFRESH_TOKEN', tokens.refresh_token);

  console.log('✅ Tokens saved to server/.env\n');

  // List albums to help user find theirs
  console.log('📚 Fetching your Google Photos albums...\n');
  try {
    const albums = await httpsGet('photoslibrary.googleapis.com', '/v1/albums?pageSize=50', tokens.access_token);
    if (albums.albums && albums.albums.length > 0) {
      console.log('Your albums:\n');
      albums.albums.forEach(a => {
        console.log(`  📁 ${a.title.padEnd(40)} ID: ${a.id}`);
      });
      console.log('\nAdd the album ID to server/.env:');
      console.log('  GOOGLE_PHOTOS_ALBUM_ID=<paste the ID above>');
    } else {
      console.log('No albums found (or none returned). Set GOOGLE_PHOTOS_ALBUM_ID=_all to use recent photos.');
    }
  } catch (e) {
    console.warn('Could not list albums:', e.message);
  }

  console.log('\nThen restart: systemctl --user restart chore-chart\n');
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
