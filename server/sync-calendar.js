#!/usr/bin/env node
// Sync Google Calendar to local database — direct API, no gog/keyring dependency
const { Pool } = require('pg');
const https = require('https');
const urlLib = require('url');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'chorechart',
  user: process.env.DB_USER || 'chorechart',
  password: process.env.DB_PASSWORD || 'chorechart',
});

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

function httpsGet(hostname, reqPath, accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path: reqPath, method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let raw = ''; res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON parse failed: ${raw.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject); req.end();
  });
}

async function getAccessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN in .env — run: node server/setup-google-auth.js');
  }

  const tokens = await httpsPost('oauth2.googleapis.com', '/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error_description || tokens.error}`);
  return tokens.access_token;
}

async function syncCalendar() {
  console.log('[Calendar Sync] Starting...');

  try {
    const accessToken = await getAccessToken();
    console.log('[Calendar Sync] Got access token ✅');

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 365);
    const timeMin = encodeURIComponent(today.toISOString());
    const timeMax = encodeURIComponent(endDate.toISOString());

    // Get list of all calendars
    const calList = await httpsGet(
      'www.googleapis.com',
      `/calendar/v3/users/me/calendarList?maxResults=100`,
      accessToken
    );

    if (calList.error) throw new Error(`Calendar list error: ${calList.error.message}`);
    const calendars = calList.items || [];
    console.log(`[Calendar Sync] Found ${calendars.length} calendars`);

    let allEvents = [];

    for (const cal of calendars) {
      try {
        const calId = encodeURIComponent(cal.id);
        const evts = await httpsGet(
          'www.googleapis.com',
          `/calendar/v3/calendars/${calId}/events?maxResults=500&singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}`,
          accessToken
        );
        if (evts.error) {
          console.warn(`[Calendar Sync] Skipping "${cal.summary}":`, evts.error.message);
          continue;
        }
        const events = evts.items || [];
        if (events.length > 0) console.log(`[Calendar Sync] ${events.length} events from "${cal.summary}"`);
        allEvents = allEvents.concat(events.map(e => ({ ...e, _calendarName: cal.summary })));
      } catch (err) {
        console.warn(`[Calendar Sync] Warning: failed "${cal.summary}":`, err.message);
      }
    }

    console.log(`[Calendar Sync] Total: ${allEvents.length} events`);

    // Clear old events and upsert
    await pool.query(`DELETE FROM calendar_events WHERE end_time < NOW() - INTERVAL '1 day'`);

    for (const event of allEvents) {
      const startRaw = event.start?.dateTime || event.start?.date;
      const endRaw   = event.end?.dateTime   || event.end?.date;
      if (!startRaw) continue;

      await pool.query(`
        INSERT INTO calendar_events (google_id, title, start_time, end_time, all_day, location, description, color_id, raw_data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (google_id) DO UPDATE SET
          title = EXCLUDED.title,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          all_day = EXCLUDED.all_day,
          location = EXCLUDED.location,
          description = EXCLUDED.description,
          color_id = EXCLUDED.color_id,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
      `, [
        event.id,
        event.summary || 'No title',
        startRaw,
        endRaw,
        !event.start?.dateTime,
        event.location || null,
        event.description || null,
        event.colorId || null,
        JSON.stringify(event),
      ]);
    }

    console.log(`[Calendar Sync] Done! Synced ${allEvents.length} events`);
    process.exit(0);
  } catch (err) {
    console.error('[Calendar Sync] Error:', err.message);
    process.exit(1);
  }
}

syncCalendar();
