/**
 * Electrolux One API integration
 * Uses Node built-in https module for reliability
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_HOST = 'api.developer.electrolux.one';
const BASE_PATH = '/api/v1';
const ENV_FILE = path.join(__dirname, '.env');

// Bootstrap access token from env — only refresh when expired
let cachedAccessToken = process.env.ELECTROLUX_ACCESS_TOKEN || null;
let tokenExpiresAt = cachedAccessToken ? (Date.now() + 11 * 60 * 60 * 1000) : 0;
let refreshPromise = null;

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timed out after 10s'));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function updateEnvTokens(newAccessToken, newRefreshToken) {
  try {
    let content = fs.readFileSync(ENV_FILE, 'utf8');
    if (newRefreshToken) {
      content = content.replace(/ELECTROLUX_REFRESH_TOKEN=.*/m, `ELECTROLUX_REFRESH_TOKEN=${newRefreshToken}`);
      process.env.ELECTROLUX_REFRESH_TOKEN = newRefreshToken;
    }
    if (newAccessToken) {
      if (content.includes('ELECTROLUX_ACCESS_TOKEN=')) {
        content = content.replace(/ELECTROLUX_ACCESS_TOKEN=.*/m, `ELECTROLUX_ACCESS_TOKEN=${newAccessToken}`);
      } else {
        content += `\nELECTROLUX_ACCESS_TOKEN=${newAccessToken}\n`;
      }
      process.env.ELECTROLUX_ACCESS_TOKEN = newAccessToken;
    }
    fs.writeFileSync(ENV_FILE, content);
    console.log('[Electrolux] Tokens saved');
  } catch (err) {
    console.error('[Electrolux] Failed to save tokens:', err.message);
  }
}

async function refreshAccessToken() {
  const apiKey = process.env.ELECTROLUX_API_KEY;
  const refreshToken = process.env.ELECTROLUX_REFRESH_TOKEN;

  if (!apiKey || !refreshToken) throw new Error('Missing Electrolux credentials');

  console.log('[Electrolux] Refreshing token...');
  const body = JSON.stringify({ refreshToken });

  const result = await httpsRequest({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/token/refresh`,
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (result.status !== 200) {
    throw new Error(`Token refresh failed (${result.status}): ${JSON.stringify(result.body)}`);
  }

  const data = result.body;
  cachedAccessToken = data.accessToken;
  tokenExpiresAt = Date.now() + (data.expiresIn || 43200) * 1000 - 60000;
  updateEnvTokens(data.accessToken, data.refreshToken);
  return cachedAccessToken;
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) return cachedAccessToken;
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function formatProgram(uid) {
  if (!uid) return null;
  return uid.replace(/^.*_PR_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function parseApplianceState(reported, type) {
  const state = reported.applianceState;
  const timeToEnd = reported.timeToEnd;

  let status = 'idle';
  if (state === 'RUNNING') status = 'running';
  else if (state === 'FINISHED' || state === 'END_OF_CYCLE') status = 'done';

  const result = {
    status,
    connected: reported.connectivityState === 'connected',
    doorState: reported.doorState,
    cyclePhase: reported.cyclePhase,
    timeRemaining: status === 'running' && timeToEnd > 0 ? Math.round(timeToEnd / 60) : null,
    program: formatProgram(reported.userSelections?.programUID),
  };

  if (type === 'WM') {
    result.totalCycles = reported.totalWashCyclesCount || 0;
    result.temperature = reported.userSelections?.analogTemperature || null;
    result.spinSpeed = reported.userSelections?.analogSpinSpeed?.replace(/_RPM/, ' RPM') || null;
  } else if (type === 'TD') {
    result.totalCycles = reported.totalCycleCounter || 0;
  }

  return result;
}

async function getApplianceState(applianceId, type) {
  const apiKey = process.env.ELECTROLUX_API_KEY;
  const token = await getAccessToken();

  const result = await httpsRequest({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/appliances/${encodeURIComponent(applianceId)}/state`,
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (result.status === 401) {
    // Force refresh and retry
    cachedAccessToken = null;
    tokenExpiresAt = 0;
    const freshToken = await getAccessToken();
    const retry = await httpsRequest({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/appliances/${encodeURIComponent(applianceId)}/state`,
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${freshToken}`,
        'Accept': 'application/json',
      },
    });
    if (retry.status !== 200) throw new Error(`Appliance state failed after retry (${retry.status})`);
    return parseApplianceState(retry.body.properties?.reported || {}, type);
  }

  if (result.status !== 200) throw new Error(`Appliance state failed (${result.status})`);
  return parseApplianceState(result.body.properties?.reported || {}, type);
}

async function getLaundryStatus() {
  const washerId = process.env.ELECTROLUX_WASHER_ID;
  const dryerId = process.env.ELECTROLUX_DRYER_ID;

  // Warm up token serially first
  await getAccessToken();

  const [washer, dryer] = await Promise.allSettled([
    getApplianceState(washerId, 'WM'),
    getApplianceState(dryerId, 'TD'),
  ]);

  return {
    washer: washer.status === 'fulfilled' ? washer.value : { status: 'error', error: washer.reason?.message },
    dryer: dryer.status === 'fulfilled' ? dryer.value : { status: 'error', error: dryer.reason?.message },
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { getLaundryStatus };
