#!/usr/bin/env node
// Sync Google Calendar to local database
const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'chorechart',
  user: process.env.DB_USER || 'chorechart',
  password: process.env.DB_PASSWORD || 'chorechart',
});

async function syncCalendar() {
  console.log('[Calendar Sync] Starting...');
  
  try {
    // Fetch next 365 days from Google
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 365);
    
    const fromStr = today.toISOString().split('T')[0];
    const toStr = endDate.toISOString().split('T')[0];
    
    const gogPath = '/home/linuxbrew/.linuxbrew/bin/gog';
    const gogEnv = { ...process.env, GOG_ACCOUNT: 'tinyerinandmatt@gmail.com' };
    
    // Get all calendars dynamically
    const { stdout: calListOut } = await execPromise(
      `${gogPath} calendar calendars --json`,
      { env: gogEnv }
    );
    const calendarData = JSON.parse(calListOut);
    const calendars = (calendarData.calendars || []).map(c => ({ id: c.id, name: c.summary }));
    
    console.log(`[Calendar Sync] Found ${calendars.length} calendars`);
    
    let allEvents = [];
    
    for (const calendar of calendars) {
      try {
        const { stdout } = await execPromise(
          `${gogPath} calendar events "${calendar.id}" --from ${fromStr} --to ${toStr} --max 500 --json`,
          { env: gogEnv }
        );
        const data = JSON.parse(stdout);
        const events = data.events || [];
        if (events.length > 0) {
          console.log(`[Calendar Sync] Fetched ${events.length} events from "${calendar.name}"`);
        }
        allEvents = allEvents.concat(events);
      } catch (err) {
        console.error(`[Calendar Sync] Warning: Failed to fetch from "${calendar.name}":`, err.message);
      }
    }
    
    const events = allEvents;
    console.log(`[Calendar Sync] Total: ${events.length} events`);
    
    // Clear old events and insert new ones
    await pool.query('DELETE FROM calendar_events WHERE end_time < NOW() - INTERVAL \'1 day\'');
    
    for (const event of events) {
      await pool.query(`
        INSERT INTO calendar_events (google_id, title, start_time, end_time, all_day, location, description, color_id, raw_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        event.start?.dateTime || event.start?.date,
        event.end?.dateTime || event.end?.date,
        !event.start?.dateTime,
        event.location || null,
        event.description || null,
        event.colorId || null,
        JSON.stringify(event)
      ]);
    }
    
    console.log(`[Calendar Sync] Done! Synced ${events.length} events`);
    process.exit(0);
  } catch (err) {
    console.error('[Calendar Sync] Error:', err.message);
    process.exit(1);
  }
}

syncCalendar();
