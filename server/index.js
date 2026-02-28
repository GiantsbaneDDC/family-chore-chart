const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const distPath = path.join(__dirname, '..', 'dist');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chorechart',
  user: process.env.DB_USER || 'chorechart',
  password: process.env.DB_PASSWORD || 'chorechart',
});

// Utility: Get current date in Sydney timezone as YYYY-MM-DD
function getSydneyDate(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

// Utility: Get start of current week (Sunday) in Sydney timezone
function getWeekStart(date = new Date()) {
  // Get the current date parts in Sydney timezone
  const sydneyStr = date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  const [year, month, day] = sydneyStr.split('-').map(Number);
  const sydneyDate = new Date(year, month - 1, day);
  
  // Find Sunday
  const dayOfWeek = sydneyDate.getDay();
  sydneyDate.setDate(sydneyDate.getDate() - dayOfWeek);
  
  return sydneyDate.toISOString().split('T')[0];
}

// Utility: Get current day of week (0=Sunday, 6=Saturday) in Sydney timezone
function getSydneyDayOfWeek(date = new Date()) {
  const sydneyStr = date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  const [year, month, day] = sydneyStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

// ================== FAMILY MEMBERS API ==================

// Get all family members
app.get('/api/members', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, color, avatar, created_at FROM family_members ORDER BY created_at'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Get single member by ID
app.get('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, color, avatar, total_stars, created_at FROM family_members WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching member:', err);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Create family member
app.post('/api/members', async (req, res) => {
  try {
    const { name, color, avatar, pin } = req.body;
    if (!name || !pin || pin.length !== 4) {
      return res.status(400).json({ error: 'Name and 4-digit PIN required' });
    }
    const result = await pool.query(
      'INSERT INTO family_members (name, color, avatar, pin) VALUES ($1, $2, $3, $4) RETURNING id, name, color, avatar, created_at',
      [name, color || '#4dabf7', avatar || '👤', pin]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating member:', err);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// Update family member
app.put('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, avatar, pin } = req.body;
    
    let query = 'UPDATE family_members SET name = $1, color = $2, avatar = $3';
    let params = [name, color, avatar];
    
    if (pin && pin.length === 4) {
      query += ', pin = $4 WHERE id = $5 RETURNING id, name, color, avatar, created_at';
      params.push(pin, id);
    } else {
      query += ' WHERE id = $4 RETURNING id, name, color, avatar, created_at';
      params.push(id);
    }
    
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Delete family member
app.delete('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM family_members WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// Verify member PIN
app.post('/api/members/:id/verify-pin', async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const result = await pool.query(
      'SELECT id, name, color, avatar FROM family_members WHERE id = $1 AND pin = $2',
      [id, pin]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    req.session.memberId = id;
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error verifying PIN:', err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// ================== CHORES API ==================

// Get all chores
app.get('/api/chores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chores ORDER BY created_at');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chores:', err);
    res.status(500).json({ error: 'Failed to fetch chores' });
  }
});

// Create chore
app.post('/api/chores', async (req, res) => {
  try {
    const { title, icon, points, money_value } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }
    const result = await pool.query(
      'INSERT INTO chores (title, icon, points, money_value) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, icon || '📋', points || 1, money_value || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating chore:', err);
    res.status(500).json({ error: 'Failed to create chore' });
  }
});

// Update chore
app.put('/api/chores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, icon, points, money_value } = req.body;
    const result = await pool.query(
      'UPDATE chores SET title = $1, icon = $2, points = $3, money_value = $4 WHERE id = $5 RETURNING *',
      [title, icon, points, money_value || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chore not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating chore:', err);
    res.status(500).json({ error: 'Failed to update chore' });
  }
});

// Delete chore
app.delete('/api/chores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM chores WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting chore:', err);
    res.status(500).json({ error: 'Failed to delete chore' });
  }
});

// ================== ASSIGNMENTS API ==================

// Get all assignments (with chore and member details)
app.get('/api/assignments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, a.chore_id, a.member_id, a.day_of_week, a.created_at,
        c.title as chore_title, c.icon as chore_icon, c.points as chore_points,
        m.name as member_name, m.color as member_color, m.avatar as member_avatar
      FROM assignments a
      JOIN chores c ON a.chore_id = c.id
      JOIN family_members m ON a.member_id = m.id
      ORDER BY a.day_of_week, m.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get assignments for a specific member
app.get('/api/assignments/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const result = await pool.query(`
      SELECT 
        a.id, a.chore_id, a.member_id, a.day_of_week, a.created_at,
        c.title as chore_title, c.icon as chore_icon, c.points as chore_points
      FROM assignments a
      JOIN chores c ON a.chore_id = c.id
      WHERE a.member_id = $1
      ORDER BY a.day_of_week
    `, [memberId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching member assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get effective "today" stats for ALL members (for home dashboard)
// Returns count of total and completed chores including rollovers
app.get('/api/assignments/effective-today-stats', async (req, res) => {
  try {
    const today = getSydneyDayOfWeek();
    const weekStart = getWeekStart();
    
    const result = await pool.query(`
      SELECT 
        m.id as member_id,
        m.name,
        m.avatar,
        m.color,
        COUNT(DISTINCT a.id) FILTER (
          WHERE a.day_of_week = $2 OR comp.id IS NULL
        ) as total_today,
        COUNT(DISTINCT a.id) FILTER (
          WHERE comp.id IS NOT NULL AND (a.day_of_week = $2 OR comp.id IS NULL)
        ) as completed_today
      FROM family_members m
      LEFT JOIN assignments a ON a.member_id = m.id AND a.day_of_week <= $2
      LEFT JOIN completions comp ON comp.assignment_id = a.id AND comp.week_start = $1
      GROUP BY m.id, m.name, m.avatar, m.color
      ORDER BY m.name
    `, [weekStart, today]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching effective today stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get effective "today" assignments for a member (includes rollover from earlier this week)
// Chores that weren't completed on their assigned day roll over to subsequent days
// until completed. Schedule resets each week.
app.get('/api/assignments/effective-today/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const today = getSydneyDayOfWeek();
    const weekStart = getWeekStart();
    
    // Get all assignments from Sunday (0) through today, 
    // LEFT JOIN with completions to find incomplete ones
    const result = await pool.query(`
      SELECT 
        a.id, a.chore_id, a.member_id, a.day_of_week as original_day,
        c.title as chore_title, c.icon as chore_icon, c.points as chore_points,
        comp.id as completion_id,
        CASE WHEN a.day_of_week < $3 AND comp.id IS NULL THEN true ELSE false END as is_rollover
      FROM assignments a
      JOIN chores c ON a.chore_id = c.id
      LEFT JOIN completions comp ON comp.assignment_id = a.id AND comp.week_start = $2
      WHERE a.member_id = $1 
        AND a.day_of_week <= $3
        AND (
          a.day_of_week = $3  -- Today's scheduled chores (show regardless of completion)
          OR comp.id IS NULL   -- Earlier chores that are NOT completed (rollover)
        )
      ORDER BY a.day_of_week, c.title
    `, [memberId, weekStart, today]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching effective today assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Create assignment
app.post('/api/assignments', async (req, res) => {
  try {
    const { chore_id, member_id, day_of_week } = req.body;
    if (chore_id === undefined || member_id === undefined || day_of_week === undefined) {
      return res.status(400).json({ error: 'chore_id, member_id, and day_of_week required' });
    }
    const result = await pool.query(
      'INSERT INTO assignments (chore_id, member_id, day_of_week) VALUES ($1, $2, $3) RETURNING *',
      [chore_id, member_id, day_of_week]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Assignment already exists' });
    }
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Delete assignment
app.delete('/api/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// Bulk update assignments for a member
app.put('/api/assignments/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { assignments } = req.body; // Array of { chore_id, day_of_week }
    
    // Delete existing assignments for this member
    await pool.query('DELETE FROM assignments WHERE member_id = $1', [memberId]);
    
    // Insert new assignments
    for (const a of assignments) {
      await pool.query(
        'INSERT INTO assignments (chore_id, member_id, day_of_week) VALUES ($1, $2, $3)',
        [a.chore_id, memberId, a.day_of_week]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating assignments:', err);
    res.status(500).json({ error: 'Failed to update assignments' });
  }
});

// ================== COMPLETIONS API ==================

// Get completions for current week
app.get('/api/completions', async (req, res) => {
  try {
    const weekStart = req.query.week_start || getWeekStart();
    const result = await pool.query(`
      SELECT 
        c.id, c.assignment_id, c.week_start, c.completed_at,
        a.chore_id, a.member_id, a.day_of_week
      FROM completions c
      JOIN assignments a ON c.assignment_id = a.id
      WHERE c.week_start = $1
    `, [weekStart]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching completions:', err);
    res.status(500).json({ error: 'Failed to fetch completions' });
  }
});

// Get completions for a specific member
app.get('/api/completions/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const weekStart = req.query.week_start || getWeekStart();
    const result = await pool.query(`
      SELECT 
        c.id, c.assignment_id, c.week_start, c.completed_at,
        a.chore_id, a.day_of_week
      FROM completions c
      JOIN assignments a ON c.assignment_id = a.id
      WHERE a.member_id = $1 AND c.week_start = $2
    `, [memberId, weekStart]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching member completions:', err);
    res.status(500).json({ error: 'Failed to fetch completions' });
  }
});

// Toggle completion (create or delete)
app.post('/api/completions/toggle', async (req, res) => {
  try {
    const { assignment_id, week_start } = req.body;
    const ws = week_start || getWeekStart();
    
    // Get assignment details for analytics
    const assignmentInfo = await pool.query(`
      SELECT a.member_id, a.chore_id, c.title as chore_title, c.points
      FROM assignments a
      JOIN chores c ON a.chore_id = c.id
      WHERE a.id = $1
    `, [assignment_id]);
    
    const assignment = assignmentInfo.rows[0];
    
    // Check if completion exists
    const existing = await pool.query(
      'SELECT id FROM completions WHERE assignment_id = $1 AND week_start = $2',
      [assignment_id, ws]
    );
    
    if (existing.rows.length > 0) {
      // Delete completion
      await pool.query('DELETE FROM completions WHERE id = $1', [existing.rows[0].id]);
      
      // Log analytics event for undo
      if (assignment) {
        await pool.query(
          'INSERT INTO analytics_events (event_type, member_id, metadata) VALUES ($1, $2, $3)',
          ['chore_uncompleted', assignment.member_id, JSON.stringify({
            chore_id: assignment.chore_id,
            chore_title: assignment.chore_title,
            assignment_id,
            week_start: ws
          })]
        );
      }
      
      res.json({ completed: false });
    } else {
      // Create completion
      await pool.query(
        'INSERT INTO completions (assignment_id, week_start) VALUES ($1, $2)',
        [assignment_id, ws]
      );
      
      // Log analytics event
      if (assignment) {
        const hour = new Date().getHours();
        await pool.query(
          'INSERT INTO analytics_events (event_type, member_id, metadata) VALUES ($1, $2, $3)',
          ['chore_completed', assignment.member_id, JSON.stringify({
            chore_id: assignment.chore_id,
            chore_title: assignment.chore_title,
            points: assignment.points,
            assignment_id,
            week_start: ws,
            hour_of_day: hour
          })]
        );
        
        // Check for achievements (fire and forget - don't block response)
        checkAndAwardAchievements(assignment.member_id).catch(err => 
          console.error('Error checking achievements:', err)
        );
      }
      
      res.json({ completed: true });
    }
  } catch (err) {
    console.error('Error toggling completion:', err);
    res.status(500).json({ error: 'Failed to toggle completion' });
  }
});

// Mark completion
app.post('/api/completions', async (req, res) => {
  try {
    const { assignment_id, week_start } = req.body;
    const ws = week_start || getWeekStart();
    
    const result = await pool.query(
      'INSERT INTO completions (assignment_id, week_start) VALUES ($1, $2) ON CONFLICT (assignment_id, week_start) DO NOTHING RETURNING *',
      [assignment_id, ws]
    );
    res.json(result.rows[0] || { already_completed: true });
  } catch (err) {
    console.error('Error creating completion:', err);
    res.status(500).json({ error: 'Failed to create completion' });
  }
});

// Delete completion (unmark)
app.delete('/api/completions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM completions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting completion:', err);
    res.status(500).json({ error: 'Failed to delete completion' });
  }
});

// ================== STATS API ==================

// Get streak for a member
app.get('/api/stats/streak/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Get last 8 weeks of completion data
    const result = await pool.query(`
      WITH weeks AS (
        SELECT generate_series(
          date_trunc('week', CURRENT_DATE - INTERVAL '7 weeks'),
          date_trunc('week', CURRENT_DATE),
          '1 week'::interval
        )::date as week_start
      ),
      member_assignments AS (
        SELECT COUNT(*) as total_per_week
        FROM assignments
        WHERE member_id = $1
      ),
      weekly_completions AS (
        SELECT 
          c.week_start,
          COUNT(DISTINCT c.assignment_id) as completed
        FROM completions c
        JOIN assignments a ON c.assignment_id = a.id
        WHERE a.member_id = $1
        GROUP BY c.week_start
      )
      SELECT 
        w.week_start,
        COALESCE(wc.completed, 0) as completed,
        ma.total_per_week
      FROM weeks w
      CROSS JOIN member_assignments ma
      LEFT JOIN weekly_completions wc ON w.week_start = wc.week_start
      ORDER BY w.week_start DESC
    `, [memberId]);
    
    // Calculate streak (consecutive weeks with all chores done)
    let streak = 0;
    for (const row of result.rows) {
      if (row.total_per_week > 0 && row.completed >= row.total_per_week) {
        streak++;
      } else if (row.week_start < getWeekStart()) {
        // Only break streak for past weeks, current week is in progress
        break;
      }
    }
    
    res.json({ streak, weeks: result.rows });
  } catch (err) {
    console.error('Error fetching streak:', err);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// Get completion history
app.get('/api/stats/history', async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 4;
    const result = await pool.query(`
      SELECT 
        c.week_start,
        m.id as member_id, m.name as member_name, m.color as member_color,
        ch.title as chore_title, ch.icon as chore_icon,
        a.day_of_week,
        c.completed_at
      FROM completions c
      JOIN assignments a ON c.assignment_id = a.id
      JOIN family_members m ON a.member_id = m.id
      JOIN chores ch ON a.chore_id = ch.id
      WHERE c.week_start >= date_trunc('week', CURRENT_DATE - INTERVAL '${weeks - 1} weeks')
      ORDER BY c.week_start DESC, c.completed_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get total points for each member this week
app.get('/api/stats/points', async (req, res) => {
  try {
    const weekStart = req.query.week_start || getWeekStart();
    const result = await pool.query(`
      SELECT 
        m.id, m.name, m.color, m.avatar,
        COALESCE(SUM(ch.points), 0) as points
      FROM family_members m
      LEFT JOIN assignments a ON m.id = a.member_id
      LEFT JOIN completions c ON a.id = c.assignment_id AND c.week_start = $1
      LEFT JOIN chores ch ON a.chore_id = ch.id AND c.id IS NOT NULL
      GROUP BY m.id, m.name, m.color, m.avatar
      ORDER BY points DESC
    `, [weekStart]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching points:', err);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// ================== ADMIN API ==================

// Verify admin PIN
app.post('/api/admin/verify', async (req, res) => {
  try {
    const { pin } = req.body;
    const result = await pool.query(
      "SELECT value FROM admin_settings WHERE key = 'admin_pin'"
    );
    const adminPin = result.rows[0]?.value || '1234';
    
    if (pin === adminPin) {
      req.session.isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid PIN' });
    }
  } catch (err) {
    console.error('Error verifying admin:', err);
    res.status(500).json({ error: 'Failed to verify' });
  }
});

// Change admin PIN
app.put('/api/admin/pin', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    const { pin } = req.body;
    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: '4-digit PIN required' });
    }
    
    await pool.query(
      "UPDATE admin_settings SET value = $1 WHERE key = 'admin_pin'",
      [pin]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating admin PIN:', err);
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

// Check admin status
app.get('/api/admin/status', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// Logout admin
app.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

// Reset all stars (admin only)
app.post('/api/admin/reset-stars', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin authentication required' });
  }
  
  try {
    // Reset all family members' total_stars to 0
    await pool.query('UPDATE family_members SET total_stars = 0');
    
    // Add a history entry for each member noting the reset
    const members = await pool.query('SELECT id, name, total_stars FROM family_members');
    for (const member of members.rows) {
      await pool.query(
        'INSERT INTO star_history (member_id, stars, description) VALUES ($1, $2, $3)',
        [member.id, 0, '⚡ Stars reset by admin']
      );
    }
    
    // Optionally clear old extra task claims (but keep history via star_history)
    // Not deleting claims - they serve as historical record
    
    res.json({ success: true, message: 'All stars have been reset to 0' });
  } catch (err) {
    console.error('Error resetting stars:', err);
    res.status(500).json({ error: 'Failed to reset stars' });
  }
});

// ================== ALLOWANCE SETTINGS API ==================

// Get allowance settings
app.get('/api/settings/allowance', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value FROM admin_settings WHERE key IN ('allowance_enabled', 'allowance_jar_max')"
    );
    const settings = {};
    for (const row of result.rows) {
      if (row.key === 'allowance_enabled') {
        settings.enabled = row.value === 'true';
      } else if (row.key === 'allowance_jar_max') {
        settings.jarMax = parseFloat(row.value) || 10;
      }
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching allowance settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update allowance settings
app.put('/api/settings/allowance', async (req, res) => {
  try {
    const { enabled, jarMax } = req.body;
    
    if (typeof enabled === 'boolean') {
      await pool.query(
        "INSERT INTO admin_settings (key, value) VALUES ('allowance_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [enabled ? 'true' : 'false']
      );
    }
    
    if (typeof jarMax === 'number' && jarMax > 0) {
      await pool.query(
        "INSERT INTO admin_settings (key, value) VALUES ('allowance_jar_max', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [jarMax.toString()]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating allowance settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ================== ALLOWANCE API ==================

// Get member's allowance balance and history
app.get('/api/allowance/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Get current balance
    const balanceResult = await pool.query(
      'SELECT allowance_balance FROM family_members WHERE id = $1',
      [memberId]
    );
    
    if (balanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Get history
    const historyResult = await pool.query(
      'SELECT id, amount, description, created_at FROM allowance_history WHERE member_id = $1 ORDER BY created_at DESC LIMIT 50',
      [memberId]
    );
    
    res.json({
      balance: parseFloat(balanceResult.rows[0].allowance_balance) || 0,
      history: historyResult.rows
    });
  } catch (err) {
    console.error('Error fetching allowance:', err);
    res.status(500).json({ error: 'Failed to fetch allowance' });
  }
});

// Record a payout (reduces balance)
app.post('/api/allowance/:memberId/payout', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }
    
    // Get current balance
    const balanceResult = await pool.query(
      'SELECT allowance_balance FROM family_members WHERE id = $1',
      [memberId]
    );
    
    if (balanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const currentBalance = parseFloat(balanceResult.rows[0].allowance_balance) || 0;
    
    if (amount > currentBalance) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Update balance
    await pool.query(
      'UPDATE family_members SET allowance_balance = allowance_balance - $1 WHERE id = $2',
      [amount, memberId]
    );
    
    // Record in history
    await pool.query(
      'INSERT INTO allowance_history (member_id, amount, description) VALUES ($1, $2, $3)',
      [memberId, -amount, description || 'Payout']
    );
    
    res.json({ 
      success: true, 
      newBalance: currentBalance - amount 
    });
  } catch (err) {
    console.error('Error processing payout:', err);
    res.status(500).json({ error: 'Failed to process payout' });
  }
});

// ================== EXTRA TASKS API ==================

// Get all extra tasks
app.get('/api/extra-tasks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, icon, stars, created_at FROM extra_tasks ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching extra tasks:', err);
    res.status(500).json({ error: 'Failed to fetch extra tasks' });
  }
});

// Create extra task
app.post('/api/extra-tasks', async (req, res) => {
  try {
    const { title, icon, stars } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const result = await pool.query(
      'INSERT INTO extra_tasks (title, icon, stars) VALUES ($1, $2, $3) RETURNING *',
      [title, icon || '⭐', stars || 1]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating extra task:', err);
    res.status(500).json({ error: 'Failed to create extra task' });
  }
});

// Update extra task
app.put('/api/extra-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, icon, stars } = req.body;
    const result = await pool.query(
      'UPDATE extra_tasks SET title = $1, icon = $2, stars = $3 WHERE id = $4 RETURNING *',
      [title, icon, stars, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extra task not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating extra task:', err);
    res.status(500).json({ error: 'Failed to update extra task' });
  }
});

// Delete extra task
app.delete('/api/extra-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM extra_tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting extra task:', err);
    res.status(500).json({ error: 'Failed to delete extra task' });
  }
});

// Get available extra tasks (not claimed today)
app.get('/api/extra-tasks/available', async (req, res) => {
  try {
    const today = getSydneyDate();
    const result = await pool.query(`
      SELECT et.id, et.title, et.icon, et.stars, et.created_at
      FROM extra_tasks et
      WHERE NOT EXISTS (
        SELECT 1 FROM extra_task_claims etc 
        WHERE etc.extra_task_id = et.id AND etc.claimed_date = $1
      )
      ORDER BY et.stars DESC, et.title
    `, [today]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching available extra tasks:', err);
    res.status(500).json({ error: 'Failed to fetch available extra tasks' });
  }
});

// Claim an extra task
app.post('/api/extra-tasks/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const { member_id } = req.body;
    const today = getSydneyDate();
    
    // Check if already claimed today
    const existing = await pool.query(
      'SELECT id FROM extra_task_claims WHERE extra_task_id = $1 AND claimed_date = $2',
      [id, today]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Task already claimed today' });
    }
    
    // Create claim
    const result = await pool.query(
      'INSERT INTO extra_task_claims (extra_task_id, member_id, claimed_date) VALUES ($1, $2, $3) RETURNING *',
      [id, member_id, today]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error claiming extra task:', err);
    res.status(500).json({ error: 'Failed to claim extra task' });
  }
});

// Get claimed extra tasks for today (with member info)
app.get('/api/extra-tasks/claims/today', async (req, res) => {
  try {
    const today = getSydneyDate();
    const result = await pool.query(`
      SELECT 
        etc.id as claim_id, etc.extra_task_id, etc.member_id, etc.claimed_date, etc.completed_at,
        et.title, et.icon, et.stars,
        fm.name as member_name, fm.avatar as member_avatar, fm.color as member_color
      FROM extra_task_claims etc
      JOIN extra_tasks et ON etc.extra_task_id = et.id
      JOIN family_members fm ON etc.member_id = fm.id
      WHERE etc.claimed_date = $1
      ORDER BY etc.created_at
    `, [today]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching today claims:', err);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Toggle extra task completion
app.post('/api/extra-tasks/claims/:claimId/toggle', async (req, res) => {
  try {
    const { claimId } = req.params;
    
    // Get current state with task details
    const current = await pool.query(`
      SELECT etc.id, etc.completed_at, etc.member_id, etc.extra_task_id, et.title, et.stars
      FROM extra_task_claims etc
      JOIN extra_tasks et ON etc.extra_task_id = et.id
      WHERE etc.id = $1
    `, [claimId]);
    
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    const claim = current.rows[0];
    
    if (claim.completed_at) {
      // Uncomplete - deduct stars
      await pool.query('UPDATE extra_task_claims SET completed_at = NULL WHERE id = $1', [claimId]);
      await pool.query('UPDATE family_members SET total_stars = GREATEST(0, total_stars - $1) WHERE id = $2', 
        [claim.stars, claim.member_id]);
      await pool.query('INSERT INTO star_history (member_id, stars, description) VALUES ($1, $2, $3)',
        [claim.member_id, -claim.stars, `Undo: ${claim.title}`]);
      res.json({ completed: false, starsChanged: -claim.stars });
    } else {
      // Complete - award stars
      await pool.query('UPDATE extra_task_claims SET completed_at = NOW() WHERE id = $1', [claimId]);
      await pool.query('UPDATE family_members SET total_stars = total_stars + $1 WHERE id = $2', 
        [claim.stars, claim.member_id]);
      await pool.query('INSERT INTO star_history (member_id, stars, description) VALUES ($1, $2, $3)',
        [claim.member_id, claim.stars, claim.title]);
      res.json({ completed: true, starsEarned: claim.stars });
    }
  } catch (err) {
    console.error('Error toggling extra task completion:', err);
    res.status(500).json({ error: 'Failed to toggle completion' });
  }
});

// Get all members with star counts (for leaderboard) - must be before :memberId route
app.get('/api/stars/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, avatar, color, total_stars
      FROM family_members
      ORDER BY total_stars DESC, name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching star leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get star history for a member
app.get('/api/stars/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    const [memberResult, historyResult] = await Promise.all([
      pool.query('SELECT total_stars FROM family_members WHERE id = $1', [memberId]),
      pool.query('SELECT id, stars, description, created_at FROM star_history WHERE member_id = $1 ORDER BY created_at DESC LIMIT 50', [memberId])
    ]);
    
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json({
      totalStars: memberResult.rows[0].total_stars || 0,
      history: historyResult.rows
    });
  } catch (err) {
    console.error('Error fetching star history:', err);
    res.status(500).json({ error: 'Failed to fetch star history' });
  }
});

// ================== KIOSK DATA API ==================

// Get all data needed for kiosk view in one call
app.get('/api/kiosk', async (req, res) => {
  try {
    const weekStart = req.query.week_start || getWeekStart();
    const today = getSydneyDate();
    
    const [members, assignments, completions, extraTaskClaims] = await Promise.all([
      pool.query('SELECT id, name, color, avatar, total_stars FROM family_members ORDER BY created_at'),
      pool.query(`
        SELECT 
          a.id, a.chore_id, a.member_id, a.day_of_week,
          c.title as chore_title, c.icon as chore_icon, c.points as chore_points
        FROM assignments a
        JOIN chores c ON a.chore_id = c.id
        ORDER BY a.day_of_week
      `),
      pool.query(`
        SELECT assignment_id, week_start
        FROM completions
        WHERE week_start = $1
      `, [weekStart]),
      pool.query(`
        SELECT 
          etc.id as claim_id, etc.extra_task_id, etc.member_id, etc.completed_at,
          et.title, et.icon, et.stars
        FROM extra_task_claims etc
        JOIN extra_tasks et ON etc.extra_task_id = et.id
        WHERE etc.claimed_date = $1
      `, [today])
    ]);
    
    res.json({
      members: members.rows,
      assignments: assignments.rows,
      completions: completions.rows.map(c => c.assignment_id),
      extraTaskClaims: extraTaskClaims.rows,
      weekStart
    });
  } catch (err) {
    console.error('Error fetching kiosk data:', err);
    res.status(500).json({ error: 'Failed to fetch kiosk data' });
  }
});

// ================== ANALYTICS API ==================

// Log an analytics event
app.post('/api/analytics/event', async (req, res) => {
  try {
    const { event_type, member_id, metadata } = req.body;
    if (!event_type) {
      return res.status(400).json({ error: 'event_type required' });
    }
    await pool.query(
      'INSERT INTO analytics_events (event_type, member_id, metadata) VALUES ($1, $2, $3)',
      [event_type, member_id || null, metadata ? JSON.stringify(metadata) : '{}']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error logging analytics event:', err);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

// Get analytics summary
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const weekStart = req.query.week_start || getWeekStart();
    
    // Get completion rate
    const completionRate = await pool.query(`
      WITH total_assignments AS (
        SELECT COUNT(*) as total
        FROM assignments
      ),
      week_completions AS (
        SELECT COUNT(*) as completed
        FROM completions
        WHERE week_start = $1
      )
      SELECT 
        COALESCE(ta.total, 0) as total_assignments,
        COALESCE(wc.completed, 0) as completed_assignments,
        CASE WHEN ta.total > 0 
          THEN ROUND((wc.completed::numeric / ta.total) * 100, 1)
          ELSE 0 
        END as completion_rate
      FROM total_assignments ta, week_completions wc
    `, [weekStart]);
    
    // Get most completed chore (all time)
    const mostCompletedChore = await pool.query(`
      SELECT c.title, c.icon, COUNT(*) as count
      FROM completions comp
      JOIN assignments a ON comp.assignment_id = a.id
      JOIN chores c ON a.chore_id = c.id
      GROUP BY c.id, c.title, c.icon
      ORDER BY count DESC
      LIMIT 1
    `);
    
    // Get least completed chore (all time) 
    const leastCompletedChore = await pool.query(`
      SELECT c.title, c.icon, COUNT(comp.id) as count
      FROM chores c
      LEFT JOIN assignments a ON c.id = a.chore_id
      LEFT JOIN completions comp ON a.id = comp.assignment_id
      GROUP BY c.id, c.title, c.icon
      ORDER BY count ASC
      LIMIT 1
    `);
    
    // Get busiest day (most completions)
    const busiestDay = await pool.query(`
      SELECT 
        EXTRACT(DOW FROM comp.completed_at) as day_of_week,
        COUNT(*) as count
      FROM completions comp
      GROUP BY EXTRACT(DOW FROM comp.completed_at)
      ORDER BY count DESC
      LIMIT 1
    `);
    
    // Total completions all time
    const totalCompletions = await pool.query(`
      SELECT COUNT(*) as total FROM completions
    `);
    
    // Total points earned this week per member
    const weeklyPoints = await pool.query(`
      SELECT 
        m.id, m.name, m.avatar, m.color,
        COALESCE(SUM(c.points), 0) as points
      FROM family_members m
      LEFT JOIN assignments a ON m.id = a.member_id
      LEFT JOIN completions comp ON a.id = comp.assignment_id AND comp.week_start = $1
      LEFT JOIN chores c ON a.chore_id = c.id AND comp.id IS NOT NULL
      GROUP BY m.id, m.name, m.avatar, m.color
      ORDER BY points DESC
    `, [weekStart]);
    
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    res.json({
      completion_rate: completionRate.rows[0],
      most_completed_chore: mostCompletedChore.rows[0] || null,
      least_completed_chore: leastCompletedChore.rows[0] || null,
      busiest_day: busiestDay.rows[0] ? {
        ...busiestDay.rows[0],
        day_name: DAYS[parseInt(busiestDay.rows[0].day_of_week)]
      } : null,
      total_completions: parseInt(totalCompletions.rows[0].total),
      weekly_points: weeklyPoints.rows
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

// ================== ACHIEVEMENTS API ==================

// Helper function to check and award achievements
async function checkAndAwardAchievements(memberId) {
  const awarded = [];
  
  // Check for first_chore
  const firstChore = await pool.query(`
    SELECT 1 FROM completions c
    JOIN assignments a ON c.assignment_id = a.id
    WHERE a.member_id = $1
    LIMIT 1
  `, [memberId]);
  
  if (firstChore.rows.length > 0) {
    const res = await awardAchievement(memberId, 'first_chore');
    if (res) awarded.push('first_chore');
  }
  
  // Check for early_bird (completed before 9am)
  const earlyBird = await pool.query(`
    SELECT 1 FROM analytics_events
    WHERE member_id = $1 
    AND event_type = 'chore_completed'
    AND (metadata->>'hour_of_day')::int < 9
    LIMIT 1
  `, [memberId]);
  
  if (earlyBird.rows.length > 0) {
    const res = await awardAchievement(memberId, 'early_bird');
    if (res) awarded.push('early_bird');
  }
  
  // Check for night_owl (completed after 8pm = hour >= 20)
  const nightOwl = await pool.query(`
    SELECT 1 FROM analytics_events
    WHERE member_id = $1 
    AND event_type = 'chore_completed'
    AND (metadata->>'hour_of_day')::int >= 20
    LIMIT 1
  `, [memberId]);
  
  if (nightOwl.rows.length > 0) {
    const res = await awardAchievement(memberId, 'night_owl');
    if (res) awarded.push('night_owl');
  }
  
  // Check for perfect_day (all chores for a specific day completed)
  const perfectDay = await pool.query(`
    WITH today_assignments AS (
      SELECT id FROM assignments 
      WHERE member_id = $1 AND day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
    ),
    today_completions AS (
      SELECT assignment_id FROM completions 
      WHERE week_start = $2 AND assignment_id IN (SELECT id FROM today_assignments)
    )
    SELECT 
      (SELECT COUNT(*) FROM today_assignments) as total,
      (SELECT COUNT(*) FROM today_completions) as completed
  `, [memberId, getWeekStart()]);
  
  const dayStats = perfectDay.rows[0];
  if (dayStats && parseInt(dayStats.total) > 0 && parseInt(dayStats.completed) >= parseInt(dayStats.total)) {
    const res = await awardAchievement(memberId, 'perfect_day');
    if (res) awarded.push('perfect_day');
  }
  
  // Check for perfect_week
  const perfectWeek = await pool.query(`
    WITH week_assignments AS (
      SELECT id FROM assignments WHERE member_id = $1
    ),
    week_completions AS (
      SELECT assignment_id FROM completions 
      WHERE week_start = $2 AND assignment_id IN (SELECT id FROM week_assignments)
    )
    SELECT 
      (SELECT COUNT(*) FROM week_assignments) as total,
      (SELECT COUNT(*) FROM week_completions) as completed
  `, [memberId, getWeekStart()]);
  
  const weekStats = perfectWeek.rows[0];
  if (weekStats && parseInt(weekStats.total) > 0 && parseInt(weekStats.completed) >= parseInt(weekStats.total)) {
    const res = await awardAchievement(memberId, 'perfect_week');
    if (res) awarded.push('perfect_week');
  }
  
  // Check for points_50 and points_100
  const weeklyPoints = await pool.query(`
    SELECT COALESCE(SUM(ch.points), 0) as points
    FROM completions c
    JOIN assignments a ON c.assignment_id = a.id
    JOIN chores ch ON a.chore_id = ch.id
    WHERE a.member_id = $1 AND c.week_start = $2
  `, [memberId, getWeekStart()]);
  
  const points = parseInt(weeklyPoints.rows[0]?.points || 0);
  if (points >= 50) {
    const res = await awardAchievement(memberId, 'points_50');
    if (res) awarded.push('points_50');
  }
  if (points >= 100) {
    const res = await awardAchievement(memberId, 'points_100');
    if (res) awarded.push('points_100');
  }
  
  // Check for streak_3 and streak_5
  const streakResult = await pool.query(`
    WITH weeks AS (
      SELECT generate_series(
        date_trunc('week', CURRENT_DATE - INTERVAL '7 weeks'),
        date_trunc('week', CURRENT_DATE),
        '1 week'::interval
      )::date as week_start
    ),
    member_assignments AS (
      SELECT COUNT(*) as total_per_week
      FROM assignments
      WHERE member_id = $1
    ),
    weekly_completions AS (
      SELECT 
        c.week_start,
        COUNT(DISTINCT c.assignment_id) as completed
      FROM completions c
      JOIN assignments a ON c.assignment_id = a.id
      WHERE a.member_id = $1
      GROUP BY c.week_start
    )
    SELECT 
      w.week_start,
      COALESCE(wc.completed, 0) as completed,
      ma.total_per_week
    FROM weeks w
    CROSS JOIN member_assignments ma
    LEFT JOIN weekly_completions wc ON w.week_start = wc.week_start
    ORDER BY w.week_start DESC
  `, [memberId]);
  
  let streak = 0;
  const currentWeekStart = getWeekStart();
  for (const row of streakResult.rows) {
    if (parseInt(row.total_per_week) > 0 && parseInt(row.completed) >= parseInt(row.total_per_week)) {
      streak++;
    } else if (row.week_start < currentWeekStart) {
      break;
    }
  }
  
  if (streak >= 3) {
    const res = await awardAchievement(memberId, 'streak_3');
    if (res) awarded.push('streak_3');
  }
  if (streak >= 5) {
    const res = await awardAchievement(memberId, 'streak_5');
    if (res) awarded.push('streak_5');
  }
  
  return awarded;
}

// Helper function to award an achievement
async function awardAchievement(memberId, achievementKey) {
  try {
    const result = await pool.query(
      'INSERT INTO member_achievements (member_id, achievement_key) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
      [memberId, achievementKey]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error('Error awarding achievement:', err);
    return false;
  }
}

// Get all achievement definitions
app.get('/api/achievements', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM achievements ORDER BY points_value, title');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching achievements:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get member's earned achievements
app.get('/api/achievements/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const result = await pool.query(`
      SELECT 
        ma.id, ma.achievement_key, ma.earned_at,
        a.title, a.description, a.icon, a.points_value
      FROM member_achievements ma
      JOIN achievements a ON ma.achievement_key = a.key
      WHERE ma.member_id = $1
      ORDER BY ma.earned_at DESC
    `, [memberId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching member achievements:', err);
    res.status(500).json({ error: 'Failed to fetch member achievements' });
  }
});

// Check and award new achievements for a member
app.post('/api/achievements/check/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const awarded = await checkAndAwardAchievements(parseInt(memberId));
    res.json({ awarded });
  } catch (err) {
    console.error('Error checking achievements:', err);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Get all members' achievements summary (for leaderboard)
app.get('/api/achievements/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id, m.name, m.avatar, m.color,
        COUNT(ma.id) as achievement_count,
        COALESCE(SUM(a.points_value), 0) as achievement_points
      FROM family_members m
      LEFT JOIN member_achievements ma ON m.id = ma.member_id
      LEFT JOIN achievements a ON ma.achievement_key = a.key
      GROUP BY m.id, m.name, m.avatar, m.color
      ORDER BY achievement_points DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all achievements:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get rewards summary (all data needed for rewards page)
app.get('/api/rewards', async (req, res) => {
  try {
    const weekStart = req.query.week_start || getWeekStart();
    
    // Get weekly leaderboard (points this week)
    const leaderboard = await pool.query(`
      SELECT 
        m.id, m.name, m.avatar, m.color,
        COALESCE(SUM(ch.points), 0) as weekly_points
      FROM family_members m
      LEFT JOIN assignments a ON m.id = a.member_id
      LEFT JOIN completions c ON a.id = c.assignment_id AND c.week_start = $1
      LEFT JOIN chores ch ON a.chore_id = ch.id AND c.id IS NOT NULL
      GROUP BY m.id, m.name, m.avatar, m.color
      ORDER BY weekly_points DESC
    `, [weekStart]);
    
    // Get streaks for all members
    const streaks = await pool.query(`
      WITH member_weeks AS (
        SELECT 
          m.id as member_id,
          m.name,
          m.avatar,
          m.color,
          generate_series(
            date_trunc('week', CURRENT_DATE - INTERVAL '7 weeks'),
            date_trunc('week', CURRENT_DATE),
            '1 week'::interval
          )::date as week_start
        FROM family_members m
      ),
      member_totals AS (
        SELECT member_id, COUNT(*) as total_per_week
        FROM assignments
        GROUP BY member_id
      ),
      weekly_completions AS (
        SELECT 
          a.member_id,
          c.week_start,
          COUNT(DISTINCT c.assignment_id) as completed
        FROM completions c
        JOIN assignments a ON c.assignment_id = a.id
        GROUP BY a.member_id, c.week_start
      )
      SELECT 
        mw.member_id as id,
        mw.name,
        mw.avatar,
        mw.color,
        mw.week_start,
        COALESCE(mt.total_per_week, 0) as total,
        COALESCE(wc.completed, 0) as completed
      FROM member_weeks mw
      LEFT JOIN member_totals mt ON mw.member_id = mt.member_id
      LEFT JOIN weekly_completions wc ON mw.member_id = wc.member_id AND mw.week_start = wc.week_start
      ORDER BY mw.member_id, mw.week_start DESC
    `);
    
    // Calculate streak per member
    const memberStreaks = {};
    const currentWeek = getWeekStart();
    
    for (const row of streaks.rows) {
      if (!memberStreaks[row.id]) {
        memberStreaks[row.id] = {
          id: row.id,
          name: row.name,
          avatar: row.avatar,
          color: row.color,
          streak: 0,
          counting: true
        };
      }
      
      const member = memberStreaks[row.id];
      if (!member.counting) continue;
      
      if (parseInt(row.total) > 0 && parseInt(row.completed) >= parseInt(row.total)) {
        member.streak++;
      } else if (row.week_start < currentWeek) {
        member.counting = false;
      }
    }
    
    // Get all member achievements
    const achievements = await pool.query(`
      SELECT 
        ma.member_id,
        ma.achievement_key,
        ma.earned_at,
        a.title,
        a.description,
        a.icon,
        a.points_value
      FROM member_achievements ma
      JOIN achievements a ON ma.achievement_key = a.key
      ORDER BY ma.earned_at DESC
    `);
    
    // Get all achievement definitions
    const allAchievements = await pool.query('SELECT * FROM achievements ORDER BY points_value, title');
    
    // Get fun stats
    const mostCompletedChore = await pool.query(`
      SELECT c.title, c.icon, COUNT(*) as count
      FROM completions comp
      JOIN assignments a ON comp.assignment_id = a.id
      JOIN chores c ON a.chore_id = c.id
      GROUP BY c.id, c.title, c.icon
      ORDER BY count DESC
      LIMIT 1
    `);
    
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const busiestDay = await pool.query(`
      SELECT 
        EXTRACT(DOW FROM comp.completed_at) as day_of_week,
        COUNT(*) as count
      FROM completions comp
      GROUP BY EXTRACT(DOW FROM comp.completed_at)
      ORDER BY count DESC
      LIMIT 1
    `);
    
    const totalCompletions = await pool.query('SELECT COUNT(*) as total FROM completions');
    
    // Group achievements by member
    const memberAchievementsMap = {};
    for (const ach of achievements.rows) {
      if (!memberAchievementsMap[ach.member_id]) {
        memberAchievementsMap[ach.member_id] = [];
      }
      memberAchievementsMap[ach.member_id].push(ach);
    }
    
    res.json({
      leaderboard: leaderboard.rows,
      streaks: Object.values(memberStreaks),
      achievements: memberAchievementsMap,
      allAchievements: allAchievements.rows,
      funStats: {
        mostCompletedChore: mostCompletedChore.rows[0] || null,
        busiestDay: busiestDay.rows[0] ? {
          ...busiestDay.rows[0],
          day_name: DAYS[parseInt(busiestDay.rows[0].day_of_week)]
        } : null,
        totalCompletions: parseInt(totalCompletions.rows[0].total)
      },
      weekStart
    });
  } catch (err) {
    console.error('Error fetching rewards:', err);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// ================== DINNER PLAN & RECIPES API ==================

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, icon, description, prep_time, cook_time, servings, 
             ingredients, instructions, tags, source_url, created_at
      FROM recipes 
      ORDER BY title
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get existing recipe source URLs (for duplicate checking) - MUST be before :id route!
app.get('/api/recipes/source-urls', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT source_url FROM recipes WHERE source_url IS NOT NULL'
    );
    res.json({ urls: result.rows.map(r => r.source_url) });
  } catch (err) {
    console.error('Error fetching source URLs:', err);
    res.status(500).json({ error: 'Failed to fetch source URLs' });
  }
});

// Get single recipe
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching recipe:', err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create recipe
app.post('/api/recipes', async (req, res) => {
  try {
    const { title, icon, description, prep_time, cook_time, servings, ingredients, instructions, tags, source_url } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }
    const result = await pool.query(
      `INSERT INTO recipes (title, icon, description, prep_time, cook_time, servings, ingredients, instructions, tags, source_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        title, 
        icon || '🍽️', 
        description || null,
        prep_time || null,
        cook_time || null,
        servings || 4,
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || []),
        JSON.stringify(tags || []),
        source_url || null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating recipe:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Update recipe
app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, icon, description, prep_time, cook_time, servings, ingredients, instructions, tags } = req.body;
    const result = await pool.query(
      `UPDATE recipes SET 
        title = $1, icon = $2, description = $3, prep_time = $4, cook_time = $5, 
        servings = $6, ingredients = $7, instructions = $8, tags = $9
       WHERE id = $10 RETURNING *`,
      [
        title, 
        icon, 
        description,
        prep_time,
        cook_time,
        servings,
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || []),
        JSON.stringify(tags || []),
        id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating recipe:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM recipes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting recipe:', err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Search for recipes on the web (uses AI with web search)
app.post('/api/recipes/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    // Use Clawdbot agent to search the web
    // Detect if user mentioned a specific site
    const siteMatch = query.match(/\b(taste\.com\.au|delicious\.com\.au|allrecipes|bbcgoodfood|recipetineats|budgetbytes|seriouseats|foodnetwork)\b/i);
    const siteHint = siteMatch ? ` Prioritize results from ${siteMatch[1]}.` : '';
    
    const searchPrompt = `Search the web for "${query} recipe".${siteHint} Find 6-8 good recipe results.

If the query mentions a specific website (like taste.com.au), make sure to include results from that site first.

Return ONLY a valid JSON array with this exact format, nothing else before or after:
[
  {"title": "Recipe Name", "url": "https://full-url-to-recipe", "description": "Brief description", "source": "website.com"}
]`;

    const aiRes = await fetch('http://127.0.0.1:18789/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.CLAWDBOT_TOKEN || '2c79636f0d115b55778772d34ad10261575935836397b7ff'),
        'x-clawdbot-agent-id': 'main'
      },
      body: JSON.stringify({
        model: 'clawdbot',
        messages: [{ role: 'user', content: searchPrompt }],
        max_tokens: 2000
      })
    });
    
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI search error:', errText);
      throw new Error(`Search failed: ${aiRes.status}`);
    }
    
    const aiData = await aiRes.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    console.log('Search response:', aiContent.substring(0, 500));
    
    // Parse the JSON array from the response
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    const results = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    
    res.json({ results });
  } catch (err) {
    console.error('Error searching recipes:', err);
    res.status(500).json({ error: 'Search failed: ' + err.message });
  }
});

// Import recipe from URL
app.post('/api/recipes/import', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    // Fetch the page content with realistic browser headers
    const pageRes = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      }
    });
    
    if (!pageRes.ok) {
      throw new Error(`Failed to fetch page: ${pageRes.status}`);
    }
    
    const html = await pageRes.text();
    
    // Extract text content (basic HTML stripping)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 15000); // Limit content size
    
    // Use Claude to extract recipe data
    const extractionPrompt = `Extract the recipe from this webpage content. Return ONLY valid JSON in this exact format, nothing else:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"]
}

Use null for any fields you can't find. For ingredients and instructions, extract ALL of them as arrays of strings.
Times should be numbers (minutes). Tags should be categories like "Quick", "Healthy", "Italian", etc.

Webpage content:
${textContent}`;

    const aiRes = await fetch('http://127.0.0.1:18789/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.CLAWDBOT_TOKEN || '2c79636f0d115b55778772d34ad10261575935836397b7ff'),
        'x-clawdbot-agent-id': 'main'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-haiku-latest',
        messages: [{ role: 'user', content: extractionPrompt }],
        max_tokens: 2000
      })
    });
    
    if (!aiRes.ok) {
      throw new Error(`AI extraction failed: ${aiRes.status}`);
    }
    
    const aiData = await aiRes.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    // Parse the JSON from the response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse recipe from page');
    }
    
    const recipe = JSON.parse(jsonMatch[0]);
    
    // Pick an appropriate icon based on tags or title
    const iconMap = {
      'pasta': '🍝', 'italian': '🍝', 'spaghetti': '🍝',
      'pizza': '🍕',
      'burger': '🍔',
      'taco': '🌮', 'mexican': '🌮',
      'asian': '🥡', 'chinese': '🥡', 'stir fry': '🥡',
      'curry': '🍛', 'indian': '🍛',
      'soup': '🍲',
      'chicken': '🍗',
      'fish': '🐟', 'seafood': '🐟',
      'salad': '🥗',
      'bbq': '🍖', 'grill': '🍖',
      'breakfast': '🍳',
      'dessert': '🍰', 'cake': '🍰',
    };
    
    let icon = '🍽️';
    const searchText = `${recipe.title || ''} ${(recipe.tags || []).join(' ')}`.toLowerCase();
    for (const [keyword, emoji] of Object.entries(iconMap)) {
      if (searchText.includes(keyword)) {
        icon = emoji;
        break;
      }
    }
    
    // Return the extracted recipe for preview (don't save yet)
    res.json({
      recipe: {
        ...recipe,
        icon,
        source_url: url,
      }
    });
  } catch (err) {
    console.error('Error importing recipe:', err);
    res.status(500).json({ error: err.message || 'Import failed' });
  }
});

// Get dinner plan for a week
app.get('/api/dinner-plan', async (req, res) => {
  try {
    const weekStart = req.query.week_start || getWeekStart();
    
    const [plans, recipes] = await Promise.all([
      pool.query(`
        SELECT 
          dp.id, dp.recipe_id, dp.day_of_week, dp.week_start, dp.notes, dp.created_at,
          r.title as recipe_title, r.icon as recipe_icon, r.description as recipe_description,
          r.prep_time as recipe_prep_time, r.cook_time as recipe_cook_time
        FROM dinner_plans dp
        JOIN recipes r ON dp.recipe_id = r.id
        WHERE dp.week_start = $1
        ORDER BY dp.day_of_week
      `, [weekStart]),
      pool.query('SELECT * FROM recipes ORDER BY title')
    ]);
    
    res.json({
      plans: plans.rows,
      recipes: recipes.rows,
      weekStart
    });
  } catch (err) {
    console.error('Error fetching dinner plan:', err);
    res.status(500).json({ error: 'Failed to fetch dinner plan' });
  }
});

// Set dinner plan for a specific day
app.post('/api/dinner-plan', async (req, res) => {
  try {
    const { recipe_id, day_of_week, week_start, notes } = req.body;
    const ws = week_start || getWeekStart();
    
    if (day_of_week === undefined || day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ error: 'Valid day_of_week (0-6) required' });
    }
    
    // Upsert - update if exists, insert if not
    const result = await pool.query(`
      INSERT INTO dinner_plans (recipe_id, day_of_week, week_start, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (day_of_week, week_start) 
      DO UPDATE SET recipe_id = $1, notes = $4
      RETURNING *
    `, [recipe_id, day_of_week, ws, notes || null]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error setting dinner plan:', err);
    res.status(500).json({ error: 'Failed to set dinner plan' });
  }
});

// Clear dinner plan for a specific day
app.delete('/api/dinner-plan/:dayOfWeek', async (req, res) => {
  try {
    const { dayOfWeek } = req.params;
    const weekStart = req.query.week_start || getWeekStart();
    
    await pool.query(
      'DELETE FROM dinner_plans WHERE day_of_week = $1 AND week_start = $2',
      [dayOfWeek, weekStart]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing dinner plan:', err);
    res.status(500).json({ error: 'Failed to clear dinner plan' });
  }
});

// Copy last week's dinner plan to current week
app.post('/api/dinner-plan/copy-week', async (req, res) => {
  try {
    const currentWeekStart = getWeekStart();
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStr = lastWeekStart.toISOString().split('T')[0];
    
    // Get last week's plans
    const lastWeek = await pool.query(
      'SELECT recipe_id, day_of_week, notes FROM dinner_plans WHERE week_start = $1',
      [lastWeekStr]
    );
    
    if (lastWeek.rows.length === 0) {
      return res.status(404).json({ error: 'No dinner plans found for last week' });
    }
    
    // Insert into current week (ignore conflicts)
    for (const plan of lastWeek.rows) {
      await pool.query(`
        INSERT INTO dinner_plans (recipe_id, day_of_week, week_start, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (day_of_week, week_start) DO NOTHING
      `, [plan.recipe_id, plan.day_of_week, currentWeekStart, plan.notes]);
    }
    
    res.json({ success: true, copied: lastWeek.rows.length });
  } catch (err) {
    console.error('Error copying dinner plan:', err);
    res.status(500).json({ error: 'Failed to copy dinner plan' });
  }
});

// ================== ASSISTANT API (for Clawdbot skill) ==================

// GET /api/assistant/family - Get family members
app.get('/api/assistant/family', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, avatar, total_stars as stars FROM family_members ORDER BY name');
    res.json({ members: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assistant/chores/today - Get today's chores with completion status
app.get('/api/assistant/chores/today', async (req, res) => {
  try {
    const weekStart = getWeekStart();
    const todayDow = getSydneyDayOfWeek();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const result = await pool.query(`
      SELECT m.name as member, m.avatar, c.title as chore, c.icon,
             CASE WHEN comp.id IS NOT NULL THEN true ELSE false END as done
      FROM assignments a
      JOIN family_members m ON a.member_id = m.id
      JOIN chores c ON a.chore_id = c.id
      LEFT JOIN completions comp ON a.id = comp.assignment_id AND comp.week_start = $1
      WHERE a.day_of_week = $2
      ORDER BY m.name, c.title
    `, [weekStart, todayDow]);
    
    res.json({ today: days[todayDow], chores: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assistant/dinner - Get dinner plan
app.get('/api/assistant/dinner', async (req, res) => {
  try {
    const week = req.query.week || 'this';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let weekStart;
    if (week === 'next') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekStart = getWeekStart(nextWeek);
    } else {
      weekStart = getWeekStart();
    }
    
    const result = await pool.query(`
      SELECT dp.day_of_week, r.title, r.icon
      FROM dinner_plans dp JOIN recipes r ON dp.recipe_id = r.id
      WHERE dp.week_start = $1 ORDER BY dp.day_of_week
    `, [weekStart]);
    
    const plan = days.map((day, i) => {
      const meal = result.rows.find(r => r.day_of_week === i);
      return { day, meal: meal ? `${meal.icon} ${meal.title}` : null };
    });
    
    res.json({ week, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assistant/recipes - Get all recipes
app.get('/api/assistant/recipes', async (req, res) => {
  try {
    const result = await pool.query('SELECT title, icon FROM recipes ORDER BY title');
    res.json({ recipes: result.rows.map(r => `${r.icon} ${r.title}`) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assistant/chores - Get all chores
app.get('/api/assistant/chores', async (req, res) => {
  try {
    const result = await pool.query('SELECT title, icon, points FROM chores ORDER BY title');
    res.json({ chores: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assistant/chores - Add a chore
app.post('/api/assistant/chores', async (req, res) => {
  try {
    const { title, icon = '📋', points = 1 } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    await pool.query('INSERT INTO chores (title, icon, points) VALUES ($1, $2, $3)', [title, icon, points]);
    res.json({ success: true, message: `Added chore "${title}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assistant/assign - Assign a chore
app.post('/api/assistant/assign', async (req, res) => {
  try {
    const { chore, member, day } = req.body;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(day.toLowerCase());
    if (dayIndex < 0) return res.status(400).json({ error: 'Invalid day' });
    
    const choreResult = await pool.query('SELECT id, title FROM chores WHERE LOWER(title) LIKE $1', [`%${chore.toLowerCase()}%`]);
    if (choreResult.rows.length === 0) return res.status(404).json({ error: `No chore matching "${chore}"` });
    
    const memberResult = await pool.query('SELECT id, name FROM family_members WHERE LOWER(name) LIKE $1', [`%${member.toLowerCase()}%`]);
    if (memberResult.rows.length === 0) return res.status(404).json({ error: `No member matching "${member}"` });
    
    await pool.query(
      'INSERT INTO assignments (chore_id, member_id, day_of_week) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [choreResult.rows[0].id, memberResult.rows[0].id, dayIndex]
    );
    res.json({ success: true, message: `Assigned "${choreResult.rows[0].title}" to ${memberResult.rows[0].name} on ${days[dayIndex]}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assistant/unassign - Remove assignment
app.post('/api/assistant/unassign', async (req, res) => {
  try {
    const { chore, member, day } = req.body;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(day.toLowerCase());
    if (dayIndex < 0) return res.status(400).json({ error: 'Invalid day' });
    
    const choreResult = await pool.query('SELECT id FROM chores WHERE LOWER(title) LIKE $1', [`%${chore.toLowerCase()}%`]);
    const memberResult = await pool.query('SELECT id FROM family_members WHERE LOWER(name) LIKE $1', [`%${member.toLowerCase()}%`]);
    
    if (choreResult.rows.length && memberResult.rows.length) {
      await pool.query(
        'DELETE FROM assignments WHERE chore_id = $1 AND member_id = $2 AND day_of_week = $3',
        [choreResult.rows[0].id, memberResult.rows[0].id, dayIndex]
      );
    }
    res.json({ success: true, message: 'Removed assignment' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assistant/complete - Mark chore complete
app.post('/api/assistant/complete', async (req, res) => {
  try {
    const { chore, member } = req.body;
    const weekStart = getWeekStart();
    const todayDow = getSydneyDayOfWeek();
    
    const choreResult = await pool.query('SELECT id, title, points FROM chores WHERE LOWER(title) LIKE $1', [`%${chore.toLowerCase()}%`]);
    if (choreResult.rows.length === 0) return res.status(404).json({ error: `No chore matching "${chore}"` });
    
    const memberResult = await pool.query('SELECT id, name FROM family_members WHERE LOWER(name) LIKE $1', [`%${member.toLowerCase()}%`]);
    if (memberResult.rows.length === 0) return res.status(404).json({ error: `No member matching "${member}"` });
    
    const assignment = await pool.query(
      'SELECT id FROM assignments WHERE chore_id = $1 AND member_id = $2 AND day_of_week = $3',
      [choreResult.rows[0].id, memberResult.rows[0].id, todayDow]
    );
    
    if (assignment.rows.length === 0) {
      return res.status(400).json({ error: `${memberResult.rows[0].name} doesn't have that chore today` });
    }
    
    await pool.query('INSERT INTO completions (assignment_id, week_start) VALUES ($1, $2) ON CONFLICT DO NOTHING', [assignment.rows[0].id, weekStart]);
    await pool.query('UPDATE family_members SET total_stars = total_stars + $1 WHERE id = $2', [choreResult.rows[0].points, memberResult.rows[0].id]);
    
    res.json({ success: true, message: `${memberResult.rows[0].name} completed "${choreResult.rows[0].title}" +${choreResult.rows[0].points} star(s)!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assistant/recipes - Add recipe
app.post('/api/assistant/recipes', async (req, res) => {
  try {
    const { title, icon = '🍽️', description = '', prep_time, cook_time } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    await pool.query(
      'INSERT INTO recipes (title, icon, description, prep_time, cook_time) VALUES ($1, $2, $3, $4, $5)',
      [title, icon, description, prep_time || null, cook_time || null]
    );
    res.json({ success: true, message: `Added recipe "${title}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assistant/dinner - Set dinner
app.post('/api/assistant/dinner', async (req, res) => {
  try {
    const { recipe, day, week = 'this' } = req.body;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(day.toLowerCase());
    if (dayIndex < 0) return res.status(400).json({ error: 'Invalid day' });
    
    const recipeResult = await pool.query('SELECT id, title FROM recipes WHERE LOWER(title) LIKE $1', [`%${recipe.toLowerCase()}%`]);
    if (recipeResult.rows.length === 0) return res.status(404).json({ error: `No recipe matching "${recipe}"` });
    
    let weekStart;
    if (week === 'next') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekStart = getWeekStart(nextWeek);
    } else {
      weekStart = getWeekStart();
    }
    
    await pool.query(
      `INSERT INTO dinner_plans (recipe_id, day_of_week, week_start) VALUES ($1, $2, $3)
       ON CONFLICT (day_of_week, week_start) DO UPDATE SET recipe_id = $1`,
      [recipeResult.rows[0].id, dayIndex, weekStart]
    );
    res.json({ success: true, message: `Set ${week === 'next' ? 'next ' : ''}${days[dayIndex]}'s dinner to "${recipeResult.rows[0].title}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/assistant/dinner - Clear dinner
app.delete('/api/assistant/dinner', async (req, res) => {
  try {
    const { day, week = 'this' } = req.body;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(day.toLowerCase());
    if (dayIndex < 0) return res.status(400).json({ error: 'Invalid day' });
    
    let weekStart;
    if (week === 'next') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekStart = getWeekStart(nextWeek);
    } else {
      weekStart = getWeekStart();
    }
    
    await pool.query('DELETE FROM dinner_plans WHERE day_of_week = $1 AND week_start = $2', [dayIndex, weekStart]);
    res.json({ success: true, message: `Cleared ${week === 'next' ? 'next ' : ''}${days[dayIndex]}'s dinner` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assistant/stars - Award stars
app.post('/api/assistant/stars', async (req, res) => {
  try {
    const { member, stars } = req.body;
    if (!stars || stars < 1) return res.status(400).json({ error: 'Need positive star count' });
    
    const memberResult = await pool.query('SELECT id, name, total_stars FROM family_members WHERE LOWER(name) LIKE $1', [`%${member.toLowerCase()}%`]);
    if (memberResult.rows.length === 0) return res.status(404).json({ error: `No member matching "${member}"` });
    
    await pool.query('UPDATE family_members SET total_stars = total_stars + $1 WHERE id = $2', [stars, memberResult.rows[0].id]);
    const newTotal = parseInt(memberResult.rows[0].total_stars) + stars;
    res.json({ success: true, message: `Gave ${stars} star(s) to ${memberResult.rows[0].name}! Now has ${newTotal} stars.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assistant/leaderboard - Get leaderboard
app.get('/api/assistant/leaderboard', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, avatar, total_stars as stars FROM family_members ORDER BY total_stars DESC');
    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== ASSISTANT ACTIONS (legacy) ==================

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Action handlers for the family assistant
const assistantActions = {
  // ---- CHORE ACTIONS ----
  async add_chore({ title, icon = '📋', points = 1, money_value = null }) {
    if (!title) return { success: false, error: 'Chore title is required' };
    const result = await pool.query(
      'INSERT INTO chores (title, icon, points, money_value) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, icon, points, money_value]
    );
    return { success: true, chore: result.rows[0], message: `Created chore "${title}"` };
  },

  async list_chores() {
    const result = await pool.query('SELECT id, title, icon, points FROM chores ORDER BY title');
    return { success: true, chores: result.rows };
  },

  async assign_chore({ chore_name, member_name, day }) {
    if (!chore_name || !member_name || day === undefined) {
      return { success: false, error: 'Need chore name, member name, and day' };
    }
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = typeof day === 'number' ? day : days.indexOf(day.toLowerCase());
    if (dayIndex < 0 || dayIndex > 6) return { success: false, error: 'Invalid day' };
    
    // Find chore
    const chore = await pool.query('SELECT id, title FROM chores WHERE LOWER(title) LIKE $1', [`%${chore_name.toLowerCase()}%`]);
    if (chore.rows.length === 0) return { success: false, error: `No chore found matching "${chore_name}"` };
    
    // Find member
    const member = await pool.query('SELECT id, name FROM family_members WHERE LOWER(name) LIKE $1', [`%${member_name.toLowerCase()}%`]);
    if (member.rows.length === 0) return { success: false, error: `No family member found matching "${member_name}"` };
    
    try {
      await pool.query(
        'INSERT INTO assignments (chore_id, member_id, day_of_week) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [chore.rows[0].id, member.rows[0].id, dayIndex]
      );
      return { success: true, message: `Assigned "${chore.rows[0].title}" to ${member.rows[0].name} on ${days[dayIndex]}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async unassign_chore({ chore_name, member_name, day }) {
    if (!chore_name || !member_name || day === undefined) {
      return { success: false, error: 'Need chore name, member name, and day' };
    }
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = typeof day === 'number' ? day : days.indexOf(day.toLowerCase());
    if (dayIndex < 0 || dayIndex > 6) return { success: false, error: 'Invalid day' };
    
    const chore = await pool.query('SELECT id, title FROM chores WHERE LOWER(title) LIKE $1', [`%${chore_name.toLowerCase()}%`]);
    if (chore.rows.length === 0) return { success: false, error: `No chore found matching "${chore_name}"` };
    
    const member = await pool.query('SELECT id, name FROM family_members WHERE LOWER(name) LIKE $1', [`%${member_name.toLowerCase()}%`]);
    if (member.rows.length === 0) return { success: false, error: `No family member found matching "${member_name}"` };
    
    await pool.query(
      'DELETE FROM assignments WHERE chore_id = $1 AND member_id = $2 AND day_of_week = $3',
      [chore.rows[0].id, member.rows[0].id, dayIndex]
    );
    return { success: true, message: `Removed "${chore.rows[0].title}" from ${member.rows[0].name} on ${days[dayIndex]}` };
  },

  async complete_chore({ chore_name, member_name }) {
    if (!chore_name || !member_name) {
      return { success: false, error: 'Need chore name and member name' };
    }
    const weekStart = getWeekStart();
    const todayDow = getSydneyDayOfWeek();
    
    const chore = await pool.query('SELECT id, title, points FROM chores WHERE LOWER(title) LIKE $1', [`%${chore_name.toLowerCase()}%`]);
    if (chore.rows.length === 0) return { success: false, error: `No chore found matching "${chore_name}"` };
    
    const member = await pool.query('SELECT id, name FROM family_members WHERE LOWER(name) LIKE $1', [`%${member_name.toLowerCase()}%`]);
    if (member.rows.length === 0) return { success: false, error: `No family member found matching "${member_name}"` };
    
    // Find assignment for today
    const assignment = await pool.query(
      'SELECT id FROM assignments WHERE chore_id = $1 AND member_id = $2 AND day_of_week = $3',
      [chore.rows[0].id, member.rows[0].id, todayDow]
    );
    if (assignment.rows.length === 0) {
      return { success: false, error: `${member.rows[0].name} doesn't have "${chore.rows[0].title}" assigned today` };
    }
    
    // Complete it
    await pool.query(
      'INSERT INTO completions (assignment_id, week_start) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [assignment.rows[0].id, weekStart]
    );
    
    // Award stars
    await pool.query(
      'UPDATE family_members SET total_stars = total_stars + $1 WHERE id = $2',
      [chore.rows[0].points, member.rows[0].id]
    );
    
    return { success: true, message: `${member.rows[0].name} completed "${chore.rows[0].title}" and earned ${chore.rows[0].points} star(s)!` };
  },

  // ---- RECIPE ACTIONS ----
  async add_recipe({ title, icon = '🍽️', description = '', prep_time = null, cook_time = null, servings = 4, ingredients = [], instructions = [], tags = [] }) {
    if (!title) return { success: false, error: 'Recipe title is required' };
    
    // Parse time strings like "20 mins" to integers
    const parseTime = (t) => {
      if (t === null || t === undefined) return null;
      if (typeof t === 'number') return t;
      const match = String(t).match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    };
    
    const result = await pool.query(
      `INSERT INTO recipes (title, icon, description, prep_time, cook_time, servings, ingredients, instructions, tags) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, icon, description, parseTime(prep_time), parseTime(cook_time), servings || 4, JSON.stringify(ingredients), JSON.stringify(instructions), JSON.stringify(tags)]
    );
    return { success: true, recipe: result.rows[0], message: `Added recipe "${title}"` };
  },

  async list_recipes() {
    const result = await pool.query('SELECT id, title, icon, description, tags FROM recipes ORDER BY title');
    return { success: true, recipes: result.rows };
  },

  async set_dinner({ recipe_name, day, week = 'this' }) {
    if (!recipe_name || day === undefined) {
      return { success: false, error: 'Need recipe name and day' };
    }
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = typeof day === 'number' ? day : days.indexOf(day.toLowerCase());
    if (dayIndex < 0 || dayIndex > 6) return { success: false, error: 'Invalid day' };
    
    const recipe = await pool.query('SELECT id, title FROM recipes WHERE LOWER(title) LIKE $1', [`%${recipe_name.toLowerCase()}%`]);
    if (recipe.rows.length === 0) return { success: false, error: `No recipe found matching "${recipe_name}"` };
    
    // Support "this" or "next" week
    let weekStart;
    if (week === 'next') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekStart = getWeekStart(nextWeek);
    } else {
      weekStart = getWeekStart();
    }
    
    await pool.query(
      `INSERT INTO dinner_plans (recipe_id, day_of_week, week_start) VALUES ($1, $2, $3)
       ON CONFLICT (day_of_week, week_start) DO UPDATE SET recipe_id = $1`,
      [recipe.rows[0].id, dayIndex, weekStart]
    );
    const weekLabel = week === 'next' ? 'next ' : '';
    return { success: true, message: `Set ${weekLabel}${days[dayIndex]}'s dinner to "${recipe.rows[0].title}"` };
  },

  async clear_dinner({ day, week = 'this' }) {
    if (day === undefined) return { success: false, error: 'Need day to clear' };
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = typeof day === 'number' ? day : days.indexOf(day.toLowerCase());
    if (dayIndex < 0 || dayIndex > 6) return { success: false, error: 'Invalid day' };
    
    let weekStart;
    if (week === 'next') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekStart = getWeekStart(nextWeek);
    } else {
      weekStart = getWeekStart();
    }
    
    await pool.query('DELETE FROM dinner_plans WHERE day_of_week = $1 AND week_start = $2', [dayIndex, weekStart]);
    const weekLabel = week === 'next' ? 'next ' : '';
    return { success: true, message: `Cleared dinner plan for ${weekLabel}${days[dayIndex]}` };
  },

  // ---- FAMILY ACTIONS ----
  async award_stars({ member_name, stars }) {
    if (!member_name || !stars) return { success: false, error: 'Need member name and number of stars' };
    const member = await pool.query('SELECT id, name, total_stars FROM family_members WHERE LOWER(name) LIKE $1', [`%${member_name.toLowerCase()}%`]);
    if (member.rows.length === 0) return { success: false, error: `No family member found matching "${member_name}"` };
    
    await pool.query('UPDATE family_members SET total_stars = total_stars + $1 WHERE id = $2', [stars, member.rows[0].id]);
    const newTotal = parseInt(member.rows[0].total_stars) + stars;
    return { success: true, message: `Awarded ${stars} star(s) to ${member.rows[0].name}! They now have ${newTotal} stars.` };
  },

  async get_member_stats({ member_name }) {
    if (!member_name) return { success: false, error: 'Need member name' };
    const member = await pool.query('SELECT * FROM family_members WHERE LOWER(name) LIKE $1', [`%${member_name.toLowerCase()}%`]);
    if (member.rows.length === 0) return { success: false, error: `No family member found matching "${member_name}"` };
    
    const m = member.rows[0];
    const weekStart = getWeekStart();
    const choresResult = await pool.query(`
      SELECT c.title, a.day_of_week, 
             CASE WHEN comp.id IS NOT NULL THEN true ELSE false END as completed
      FROM assignments a
      JOIN chores c ON a.chore_id = c.id
      LEFT JOIN completions comp ON a.id = comp.assignment_id AND comp.week_start = $2
      WHERE a.member_id = $1
      ORDER BY a.day_of_week
    `, [m.id, weekStart]);
    
    return { 
      success: true, 
      member: { name: m.name, avatar: m.avatar, stars: m.total_stars, allowance: m.allowance_balance },
      chores: choresResult.rows
    };
  }
};

// Execute an action from the assistant
async function executeAction(actionName, params) {
  if (!assistantActions[actionName]) {
    return { success: false, error: `Unknown action: ${actionName}` };
  }
  try {
    return await assistantActions[actionName](params);
  } catch (err) {
    console.error(`Action ${actionName} failed:`, err);
    return { success: false, error: err.message };
  }
}

// ================== CHAT API (Family Assistant via Clawdbot) ==================

app.post('/api/chat', async (req, res) => {
  try {
    const { message, voice = true, history = [] } = req.body;
    
    // Get current family data for context
    const weekStart = getWeekStart();
    const todayDow = getSydneyDayOfWeek();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Calculate next week start
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStart = getWeekStart(nextWeekDate);
    
    // Gather context data
    const [membersResult, choreStats, dinnerPlan, nextWeekDinnerPlan, leaderboard] = await Promise.all([
      pool.query('SELECT name, avatar, total_stars FROM family_members ORDER BY name'),
      pool.query(`
        SELECT m.name, m.avatar, COUNT(a.id) as total, COUNT(c.id) as done
        FROM family_members m
        LEFT JOIN assignments a ON m.id = a.member_id AND a.day_of_week = $1
        LEFT JOIN completions c ON a.id = c.assignment_id AND c.week_start = $2
        GROUP BY m.id, m.name, m.avatar ORDER BY m.name
      `, [todayDow, weekStart]),
      pool.query(`
        SELECT dp.day_of_week, r.title, r.icon, r.description, r.prep_time, r.cook_time
        FROM dinner_plans dp JOIN recipes r ON dp.recipe_id = r.id
        WHERE dp.week_start = $1 ORDER BY dp.day_of_week
      `, [weekStart]),
      pool.query(`
        SELECT dp.day_of_week, r.title, r.icon
        FROM dinner_plans dp JOIN recipes r ON dp.recipe_id = r.id
        WHERE dp.week_start = $1 ORDER BY dp.day_of_week
      `, [nextWeekStart]),
      pool.query('SELECT name, avatar, total_stars FROM family_members ORDER BY total_stars DESC')
    ]);
    
    // Calculate chore stats first
    const totalChores = choreStats.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const doneChores = choreStats.rows.reduce((sum, r) => sum + parseInt(r.done), 0);
    
    // Get all chores and recipes for context
    const [allChores, allRecipes] = await Promise.all([
      pool.query('SELECT id, title, icon, points FROM chores ORDER BY title'),
      pool.query('SELECT id, title, icon FROM recipes ORDER BY title')
    ]);

    // Build context string with action capabilities
    let context = `You are the Family Assistant for this household's Family Hub app (displayed on a tablet).
Today is ${days[todayDow]}.

YOUR ROLE:
- Help the family with chores, meal planning, and tracking stars/rewards
- You CAN perform actions to manage the app (add chores, recipes, assignments, etc.)
- Keep responses SHORT and friendly (1-3 sentences usually) - this is spoken aloud
- Use simple language suitable for kids ages 8-14

FAMILY MEMBERS: ${membersResult.rows.map(m => `${m.avatar} ${m.name} (${m.total_stars || 0} stars)`).join(', ')}

TODAY'S CHORES (${doneChores}/${totalChores} complete):
${choreStats.rows.filter(m => parseInt(m.total) > 0).map(m => `  ${m.avatar} ${m.name}: ${m.done}/${m.total}${parseInt(m.done) === parseInt(m.total) ? ' ✅' : ''}`).join('\n')}

AVAILABLE CHORES: ${allChores.rows.map(c => `${c.icon} ${c.title}`).join(', ')}

DINNER PLAN THIS WEEK (week of ${weekStart}):
${days.map((day, i) => {
  const plan = dinnerPlan.rows.find(r => r.day_of_week === i);
  const isToday = i === todayDow;
  return `  ${isToday ? '👉 ' : ''}${day}: ${plan ? `${plan.icon} ${plan.title}` : 'Not planned'}`;
}).join('\n')}

DINNER PLAN NEXT WEEK (week of ${nextWeekStart}):
${days.map((day, i) => {
  const plan = nextWeekDinnerPlan.rows.find(r => r.day_of_week === i);
  return `  ${day}: ${plan ? `${plan.icon} ${plan.title}` : 'Not planned'}`;
}).join('\n')}

AVAILABLE RECIPES: ${allRecipes.rows.map(r => `${r.icon} ${r.title}`).join(', ')}

STAR LEADERBOARD:
${leaderboard.rows.map((m, i) => {
  const medals = ['🥇', '🥈', '🥉'];
  return `  ${medals[i] || `${i+1}.`} ${m.avatar} ${m.name}: ${m.total_stars || 0} stars`;
}).join('\n')}

AVAILABLE ACTIONS:
To perform an action, include a JSON block in your response like this:
\`\`\`action
{"action": "action_name", "params": {...}}
\`\`\`

Actions you can use:
- add_chore: Create a new chore. Params: title (required), icon, points (default 1)
- assign_chore: Assign chore to someone. Params: chore_name, member_name, day (e.g. "monday")
- unassign_chore: Remove assignment. Params: chore_name, member_name, day
- complete_chore: Mark done (today only). Params: chore_name, member_name
- add_recipe: Add new recipe. Params: title (required), icon, description, prep_time, cook_time, ingredients (array), instructions (array)
- set_dinner: Set meal for a day. Params: recipe_name, day, week ("this" or "next", default "this")
- clear_dinner: Remove meal plan. Params: day, week ("this" or "next", default "this")
- award_stars: Give bonus stars. Params: member_name, stars (number)

GUIDELINES:
- Always confirm before making changes (unless it's clearly a direct request)
- After an action, tell them what you did in a friendly way
- If an action fails, explain what went wrong simply
- You can chat normally too - tell jokes, help with homework, etc.
- Only use actions when the user actually wants to change something`;
    
    // Call Clawdbot gateway
    const response = await fetch('http://127.0.0.1:18789/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.CLAWDBOT_TOKEN || '2c79636f0d115b55778772d34ad10261575935836397b7ff'),
        'x-clawdbot-agent-id': 'main'
      },
      body: JSON.stringify({
        model: 'clawdbot',
        messages: [
          { role: 'system', content: context },
          // Include conversation history for context
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`Clawdbot API error: ${response.status}`);
    }
    
    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "I'm having trouble thinking right now. Try again!";
    
    // Parse and execute any actions in the response
    const actionMatch = reply.match(/```action\s*\n?([\s\S]*?)\n?```/);
    let actionResult = null;
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        console.log('Executing action:', actionData);
        actionResult = await executeAction(actionData.action, actionData.params || {});
        console.log('Action result:', actionResult);
        
        // Remove the action block from the reply
        reply = reply.replace(/```action\s*\n?[\s\S]*?\n?```/g, '').trim();
        
        // If the action was successful and reply is now empty, use the action message
        if (actionResult.success && !reply) {
          reply = actionResult.message || 'Done!';
        } else if (!actionResult.success) {
          // Append error info if action failed
          reply = reply || `Sorry, that didn't work: ${actionResult.error}`;
        }
      } catch (parseErr) {
        console.error('Failed to parse action:', parseErr);
      }
    }
    
    // Generate audio if voice is enabled
    let audioUrl = null;
    if (voice) {
      try {
        const audioFile = `/tmp/assistant-${Date.now()}.mp3`;
        // Clean text for speech (remove markdown, emojis)
        const cleanText = reply
          .replace(/\*\*/g, '')
          .replace(/[#*_~`]/g, '')
          .replace(/\n+/g, ' ')
          .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
          .trim();
        
        // Use sag for TTS with Charlie voice
        await execPromise(`/home/linuxbrew/.linuxbrew/bin/sag -o "${audioFile}" -v IKne3meq5aSn9XLyUdCD "${cleanText.replace(/"/g, '\\"')}"`, {
          env: { ...process.env, ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '' }
        });
        
        audioUrl = `/audio/${path.basename(audioFile)}`;
      } catch (ttsErr) {
        console.error('TTS error:', ttsErr);
      }
    }
    
    res.json({ reply, audioUrl, actionResult });
  } catch (err) {
    console.error('Error in chat:', err);
    res.status(500).json({ reply: "Oops! I couldn't connect to my brain. Try again in a moment! 🤔" });
  }
});

// ================== CHAT API V2 (Minimal context, text-based actions) ==================

// Action execution - calls our own API
async function executeTool(name, args) {
  const apiBase = 'http://127.0.0.1:8080/api/assistant';
  const endpoints = {
    get_family: { method: 'GET', path: '/family' },
    get_todays_chores: { method: 'GET', path: '/chores/today' },
    get_dinner_plan: { method: 'GET', path: `/dinner?week=${args.week || 'this'}` },
    get_recipes: { method: 'GET', path: '/recipes' },
    get_chores: { method: 'GET', path: '/chores' },
    add_chore: { method: 'POST', path: '/chores', body: args },
    assign_chore: { method: 'POST', path: '/assign', body: args },
    complete_chore: { method: 'POST', path: '/complete', body: args },
    add_recipe: { method: 'POST', path: '/recipes', body: args },
    set_dinner: { method: 'POST', path: '/dinner', body: args },
    award_stars: { method: 'POST', path: '/stars', body: args },
    get_leaderboard: { method: 'GET', path: '/leaderboard' }
  };
  
  const ep = endpoints[name];
  if (!ep) return { error: `Unknown tool: ${name}` };
  
  try {
    const options = { method: ep.method, headers: { 'Content-Type': 'application/json' } };
    if (ep.body) options.body = JSON.stringify(ep.body);
    const res = await fetch(`${apiBase}${ep.path}`, options);
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

app.post('/api/chat/v2', async (req, res) => {
  try {
    const { message, voice = true, history = [] } = req.body;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[getSydneyDayOfWeek()];
    
    // Minimal context - just what's needed
    const context = `You are the Family Hub assistant on a kitchen tablet. Today is ${today}.
Be brief (1-2 sentences) - spoken aloud via TTS. Be friendly. Kids use this.

To perform actions, respond with JSON:
{"action":"<name>","params":{...}}

Actions: get_family, get_todays_chores, get_dinner_plan(week), get_recipes, get_chores,
add_chore(title,icon?,points?), assign_chore(chore,member,day), complete_chore(chore,member),
add_recipe(title,icon?,description?), set_dinner(recipe,day,week?), award_stars(member,stars), get_leaderboard

If you need data, use an action first. After action results, give a friendly response.`;

    let messages = [
      { role: 'system', content: context },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];
    
    let reply = '';
    let actionPerformed = false;
    
    // Loop for actions (max 3 iterations)
    for (let i = 0; i < 3; i++) {
      const response = await fetch('http://127.0.0.1:18789/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (process.env.CLAWDBOT_TOKEN || '2c79636f0d115b55778772d34ad10261575935836397b7ff'),
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-5-haiku-latest',
          messages,
          max_tokens: 200
        })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      reply = data.choices?.[0]?.message?.content || '';
      
      // Check for action JSON
      const actionMatch = reply.match(/\{[\s]*"action"[\s]*:[\s]*"([^"]+)"[\s]*,?[\s]*"params"[\s]*:[\s]*(\{[^}]*\})?\s*\}/);
      if (actionMatch) {
        try {
          const actionName = actionMatch[1];
          const params = actionMatch[2] ? JSON.parse(actionMatch[2]) : {};
          console.log(`Action: ${actionName}`, params);
          
          const result = await executeTool(actionName, params);
          console.log('Result:', result);
          
          if (result.success) actionPerformed = true;
          
          // Add to messages and continue
          messages.push({ role: 'assistant', content: reply });
          messages.push({ role: 'user', content: `Action result: ${JSON.stringify(result)}` });
          continue;
        } catch (e) {
          console.error('Action parse error:', e);
        }
      }
      
      // No action, we have final reply
      break;
    }
    
    // Clean up any leftover JSON from reply
    reply = reply.replace(/\{[\s]*"action"[\s]*:[\s\S]*?\}/g, '').trim();
    if (!reply) reply = "Done!";
    
    // Generate TTS
    let audioUrl = null;
    if (voice && reply) {
      try {
        const audioFile = `/tmp/assistant-${Date.now()}.mp3`;
        const cleanText = reply.replace(/\*\*/g, '').replace(/[#*_~`]/g, '').replace(/\n+/g, ' ').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
        await execPromise(`/home/linuxbrew/.linuxbrew/bin/sag -o "${audioFile}" -v IKne3meq5aSn9XLyUdCD "${cleanText.replace(/"/g, '\\"')}"`, {
          env: { ...process.env, ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '' }
        });
        audioUrl = `/audio/${path.basename(audioFile)}`;
      } catch (ttsErr) {
        console.error('TTS error:', ttsErr);
      }
    }
    
    res.json({ reply, audioUrl, actionPerformed });
  } catch (err) {
    console.error('Chat v2 error:', err);
    res.status(500).json({ reply: "Oops! Something went wrong. Try again!" });
  }
});

// ================== CALENDAR API (from synced database) ==================

// GET /api/calendar - Get calendar events from local DB
app.get('/api/calendar', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const from = req.query.from; // Optional start date (YYYY-MM-DD)
    
    // Use date strings for comparison to avoid timezone issues
    let startDateStr, endDateStr;
    if (from) {
      startDateStr = from; // YYYY-MM-DD
      const endDate = new Date(from);
      endDate.setDate(endDate.getDate() + days);
      endDateStr = endDate.toISOString().split('T')[0];
    } else {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDateStr = startDate.toISOString().split('T')[0];
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + days);
      endDateStr = endDate.toISOString().split('T')[0];
    }
    
    // Query events that either:
    // 1. Start within the date range, OR
    // 2. Are multi-day events that overlap the date range (started before but end after start)
    const result = await pool.query(`
      SELECT google_id as id, title, start_time as start, end_time as end, 
             all_day as "allDay", location, description, color_id as color
      FROM calendar_events
      WHERE (
        -- Events starting in range
        DATE(start_time AT TIME ZONE 'Australia/Sydney') >= $1 
        AND DATE(start_time AT TIME ZONE 'Australia/Sydney') <= $2
      ) OR (
        -- Multi-day events that started before but overlap our range
        DATE(start_time AT TIME ZONE 'Australia/Sydney') < $1
        AND DATE(end_time AT TIME ZONE 'Australia/Sydney') > $1
      )
      ORDER BY start_time
    `, [startDateStr, endDateStr]);
    
    res.json({ events: result.rows });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar', events: [] });
  }
});

// GET /api/calendar/today - Get just today's events
app.get('/api/calendar/today', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT google_id as id, title, start_time as start, end_time as end,
             all_day as "allDay", location
      FROM calendar_events
      WHERE DATE(start_time AT TIME ZONE 'Australia/Sydney') = CURRENT_DATE
         OR (all_day = true AND start_time::date <= CURRENT_DATE AND end_time::date > CURRENT_DATE)
      ORDER BY all_day DESC, start_time
    `);
    
    res.json({ events: result.rows });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar', events: [] });
  }
});

// POST /api/calendar/sync - Manual sync trigger
app.post('/api/calendar/sync', async (req, res) => {
  try {
    const { stdout, stderr } = await execPromise(
      'node /home/matt/clawd/chore-chart/server/sync-calendar.js',
      { timeout: 30000 }
    );
    res.json({ success: true, output: stdout });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

// ================== FITNESS TRACKING API ==================

// Get all activities
app.get('/api/activities', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, icon, points, category FROM activities ORDER BY category, name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Create activity
app.post('/api/activities', async (req, res) => {
  try {
    const { name, icon, points, category } = req.body;
    const result = await pool.query(
      `INSERT INTO activities (name, icon, points, category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, icon || '🏃', points || 5, category || 'general']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// Update activity
app.put('/api/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, points, category } = req.body;
    const result = await pool.query(
      `UPDATE activities SET name = $1, icon = $2, points = $3, category = $4
       WHERE id = $5 RETURNING *`,
      [name, icon, points, category, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating activity:', err);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Delete activity
app.delete('/api/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM activities WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// Log an activity
app.post('/api/activity-logs', async (req, res) => {
  try {
    const { member_id, activity_id, duration_mins, notes, log_date } = req.body;
    const date = log_date || getSydneyDate();
    
    const result = await pool.query(
      `INSERT INTO activity_logs (member_id, activity_id, log_date, duration_mins, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [member_id, activity_id, date, duration_mins || null, notes || null]
    );
    
    // Update streak
    await updateFitnessStreak(member_id);
    
    // Award points
    const activity = await pool.query('SELECT points FROM activities WHERE id = $1', [activity_id]);
    if (activity.rows.length > 0) {
      // Track analytics
      await pool.query(
        `INSERT INTO analytics_events (event_type, member_id, metadata)
         VALUES ('activity_logged', $1, $2)`,
        [member_id, JSON.stringify({ activity_id, points: activity.rows[0].points })]
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error logging activity:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Get activity logs for a member
app.get('/api/activity-logs/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { days = 7 } = req.query;
    
    const result = await pool.query(
      `SELECT al.*, a.name as activity_name, a.icon as activity_icon, a.points as activity_points
       FROM activity_logs al
       JOIN activities a ON al.activity_id = a.id
       WHERE al.member_id = $1 AND al.log_date >= CURRENT_DATE - $2::int
       ORDER BY al.log_date DESC, al.created_at DESC`,
      [memberId, days]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get today's activities for all members
app.get('/api/activity-logs/today', async (req, res) => {
  try {
    const today = getSydneyDate();
    const result = await pool.query(
      `SELECT al.*, a.name as activity_name, a.icon as activity_icon, a.points as activity_points,
              fm.name as member_name, fm.avatar as member_avatar
       FROM activity_logs al
       JOIN activities a ON al.activity_id = a.id
       JOIN family_members fm ON al.member_id = fm.id
       WHERE al.log_date = $1
       ORDER BY al.created_at DESC`,
      [today]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching today activities:', err);
    res.status(500).json({ error: 'Failed to fetch today activities' });
  }
});

// Get weekly family stats
app.get('/api/fitness/weekly-stats', async (req, res) => {
  try {
    const weekStart = getWeekStart();
    
    // Total activities this week
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total_activities, COALESCE(SUM(a.points), 0) as total_points
       FROM activity_logs al
       JOIN activities a ON al.activity_id = a.id
       WHERE al.log_date >= $1`,
      [weekStart]
    );
    
    // Per-member breakdown
    const memberResult = await pool.query(
      `SELECT fm.id, fm.name, fm.avatar, fm.color,
              COUNT(al.id) as activity_count,
              COALESCE(SUM(a.points), 0) as points
       FROM family_members fm
       LEFT JOIN activity_logs al ON fm.id = al.member_id AND al.log_date >= $1
       LEFT JOIN activities a ON al.activity_id = a.id
       GROUP BY fm.id, fm.name, fm.avatar, fm.color
       ORDER BY points DESC`,
      [weekStart]
    );
    
    // Days with activity this week
    const daysResult = await pool.query(
      `SELECT DISTINCT log_date FROM activity_logs WHERE log_date >= $1`,
      [weekStart]
    );
    
    res.json({
      week_start: weekStart,
      total_activities: parseInt(totalResult.rows[0].total_activities),
      total_points: parseInt(totalResult.rows[0].total_points),
      active_days: daysResult.rows.length,
      members: memberResult.rows.map(m => ({
        ...m,
        activity_count: parseInt(m.activity_count),
        points: parseInt(m.points)
      }))
    });
  } catch (err) {
    console.error('Error fetching weekly stats:', err);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

// Get member's fitness streak
app.get('/api/fitness/streak/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const result = await pool.query(
      `SELECT * FROM fitness_streaks WHERE member_id = $1`,
      [memberId]
    );
    
    if (result.rows.length === 0) {
      res.json({ current_streak: 0, longest_streak: 0, last_activity_date: null });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error fetching streak:', err);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// Get all streaks
app.get('/api/fitness/streaks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fs.*, fm.name, fm.avatar, fm.color
       FROM fitness_streaks fs
       JOIN family_members fm ON fs.member_id = fm.id
       ORDER BY fs.current_streak DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching streaks:', err);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

// Delete an activity log
app.delete('/api/activity-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM activity_logs WHERE id = $1 RETURNING member_id',
      [id]
    );
    
    if (result.rows.length > 0) {
      // Recalculate streak
      await updateFitnessStreak(result.rows[0].member_id);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting activity log:', err);
    res.status(500).json({ error: 'Failed to delete activity log' });
  }
});

// Helper function to update fitness streak
async function updateFitnessStreak(memberId) {
  try {
    // Get all activity dates for this member, ordered desc
    const result = await pool.query(
      `SELECT DISTINCT log_date FROM activity_logs 
       WHERE member_id = $1 
       ORDER BY log_date DESC`,
      [memberId]
    );
    
    if (result.rows.length === 0) {
      // No activities, reset streak
      await pool.query(
        `INSERT INTO fitness_streaks (member_id, current_streak, longest_streak, last_activity_date, updated_at)
         VALUES ($1, 0, 0, NULL, NOW())
         ON CONFLICT (member_id) DO UPDATE SET
           current_streak = 0,
           last_activity_date = NULL,
           updated_at = NOW()`,
        [memberId]
      );
      return;
    }
    
    const dates = result.rows.map(r => r.log_date);
    const today = getSydneyDate();
    
    // Calculate current streak
    let streak = 0;
    let checkDate = new Date(today);
    
    for (const date of dates) {
      const dateStr = new Date(date).toISOString().split('T')[0];
      const checkStr = checkDate.toISOString().split('T')[0];
      
      if (dateStr === checkStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < checkStr) {
        // Missed a day, streak broken (unless it's today and no activity yet)
        if (streak === 0) {
          // Check if the first activity was yesterday
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (dateStr === yesterday.toISOString().split('T')[0]) {
            streak = 1;
            checkDate = new Date(yesterday);
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    
    // Get current longest streak
    const currentData = await pool.query(
      'SELECT longest_streak FROM fitness_streaks WHERE member_id = $1',
      [memberId]
    );
    const longestStreak = currentData.rows.length > 0 
      ? Math.max(currentData.rows[0].longest_streak, streak)
      : streak;
    
    // Update streak
    await pool.query(
      `INSERT INTO fitness_streaks (member_id, current_streak, longest_streak, last_activity_date, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (member_id) DO UPDATE SET
         current_streak = $2,
         longest_streak = GREATEST(fitness_streaks.longest_streak, $3),
         last_activity_date = $4,
         updated_at = NOW()`,
      [memberId, streak, longestStreak, dates[0]]
    );
  } catch (err) {
    console.error('Error updating streak:', err);
  }
}

// ================== STATIC FILES ==================

// Serve audio files from /tmp
app.use('/audio', express.static('/tmp'));

// ─── Electrolux Laundry API ─────────────────────────────────────────────────
const { getLaundryStatus } = require('./electrolux');

let laundryCache = null;
const laundryPrevStatus = { WM: null, TD: null };
const laundryRunStart = { WM: null, TD: null };

async function logCycleCompletion(type, prev, curr) {
  try {
    const name = type === 'WM' ? 'Washing machine' : 'Dryer';
    const started = laundryRunStart[type];
    const durationMin = started ? Math.round((Date.now() - started) / 60000) : null;
    await pool.query(
      `INSERT INTO laundry_cycles (appliance_type, appliance_name, program, cycle_phase, started_at, completed_at, duration_minutes, temperature, spin_speed, total_cycles_at_log)
       VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9)`,
      [type, name, prev.program, prev.cyclePhase, started ? new Date(started).toISOString() : null,
       durationMin, prev.temperature || null, prev.spinSpeed || null, curr.totalCycles || null]
    );
    console.log(`[Electrolux] Logged completed ${name} cycle: ${prev.program}`);
  } catch (err) {
    console.error('[Electrolux] Failed to log cycle:', err.message);
  }
}

async function pollLaundry() {
  try {
    const data = await getLaundryStatus();

    // Detect cycle completions
    for (const [type, key] of [['WM', 'washer'], ['TD', 'dryer']]) {
      const curr = data[key];
      const prev = laundryPrevStatus[type];
      if (curr.status === 'running' && !laundryRunStart[type]) {
        laundryRunStart[type] = Date.now();
      }
      if (prev && prev.status === 'running' && curr.status !== 'running') {
        await logCycleCompletion(type, prev, curr);
        laundryRunStart[type] = null;
      }
      laundryPrevStatus[type] = curr;
    }

    laundryCache = data;
    console.log('[Electrolux] Polled OK:', data.washer.status, '/', data.dryer.status);
  } catch (err) {
    console.error('[Electrolux] Poll error:', err.message);
  }
}

// Poll immediately on startup, then every 60s
pollLaundry();
setInterval(pollLaundry, 60000);

app.get('/api/laundry', (req, res) => {
  if (!laundryCache) return res.json({ washer: { status: 'idle' }, dryer: { status: 'idle' }, loading: true });
  res.json(laundryCache);
});

app.get('/api/laundry/history/:type', async (req, res) => {
  try {
    const type = req.params.type.toUpperCase(); // WM or TD
    const rows = await pool.query(
      `SELECT * FROM laundry_cycles WHERE appliance_type=$1 ORDER BY completed_at DESC LIMIT 30`,
      [type]
    );
    // Also return weekly/monthly counts
    const weekly = await pool.query(
      `SELECT DATE_TRUNC('day', completed_at AT TIME ZONE 'Australia/Sydney') as day, COUNT(*) as cycles
       FROM laundry_cycles WHERE appliance_type=$1 AND completed_at > NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day`,
      [type]
    );
    res.json({ cycles: rows.rows, weekly: weekly.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Google Drive Photos Slideshow
// ─────────────────────────────────────────────

let photosCache = { photos: [], fetchedAt: 0 };
const PHOTOS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
let _driveAccessToken = null;
let _driveTokenExpiry = 0;

async function getDriveAccessToken() {
  if (_driveAccessToken && Date.now() < _driveTokenExpiry - 60000) return _driveAccessToken;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth not configured. Run: node server/setup-google-auth.js');
  }

  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.error) return reject(new Error(parsed.error_description || parsed.error));
        _driveAccessToken = parsed.access_token;
        _driveTokenExpiry = Date.now() + (parsed.expires_in || 3600) * 1000;
        resolve(parsed.access_token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getDriveFolderPhotos(accessToken) {
  const folderName = process.env.GOOGLE_DRIVE_FOLDER || 'Family Photos';

  // Find the folder by name
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files?q=${query}&fields=files(id,name)`,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.error) return reject(new Error(parsed.error.message));
        if (!parsed.files || parsed.files.length === 0) {
          return reject(new Error(`Drive folder "${folderName}" not found. Create it in Google Drive and add photos.`));
        }
        const folderId = parsed.files[0].id;

        // List image files in folder
        const imgQuery = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`);
        const req2 = https.request({
          hostname: 'www.googleapis.com',
          path: `/drive/v3/files?q=${imgQuery}&fields=files(id,name,description)&pageSize=100&orderBy=name`,
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        }, (res2) => {
          let data2 = '';
          res2.on('data', d => data2 += d);
          res2.on('end', () => {
            const parsed2 = JSON.parse(data2);
            if (parsed2.error) return reject(new Error(parsed2.error.message));
            const photos = (parsed2.files || []).map(f => ({
              id: f.id,
              url: `/api/photos/proxy/${f.id}`,
              description: f.description || '',
            }));
            resolve(photos);
          });
        });
        req2.on('error', reject);
        req2.end();
      });
    });
    req.on('error', reject);
    req.end();
  });
}

app.get('/api/photos', async (req, res) => {
  try {
    const now = Date.now();
    if (photosCache.photos.length > 0 && now - photosCache.fetchedAt < PHOTOS_CACHE_TTL) {
      return res.json({ photos: photosCache.photos, cached: true });
    }

    const accessToken = await getDriveAccessToken();
    const photos = await getDriveFolderPhotos(accessToken);

    // Shuffle
    for (let i = photos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photos[i], photos[j]] = [photos[j], photos[i]];
    }

    photosCache = { photos, fetchedAt: now };
    res.json({ photos });
  } catch (err) {
    console.error('[Photos API]', err.message);
    res.json({ photos: [], error: err.message });
  }
});

// Proxy Drive images (keeps photos private, no auth needed client-side)
app.get('/api/photos/proxy/:fileId', async (req, res) => {
  try {
    const accessToken = await getDriveAccessToken();
    const { fileId } = req.params;

    const driveReq = https.request({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files/${fileId}?alt=media`,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (driveRes) => {
      // Follow redirects
      if (driveRes.statusCode === 302 || driveRes.statusCode === 301) {
        res.redirect(driveRes.headers.location);
        return;
      }
      res.setHeader('Content-Type', driveRes.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      driveRes.pipe(res);
    });
    driveReq.on('error', (err) => res.status(500).json({ error: err.message }));
    driveReq.end();
  } catch (err) {
    console.error('[Photos Proxy]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Invalidate photo cache
app.post('/api/photos/refresh', (req, res) => {
  photosCache = { photos: [], fetchedAt: 0 };
  res.json({ ok: true });
});

// Serve static files from dist
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

// Start server(s)
const PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// Try to load SSL certificates for HTTPS
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  // Start HTTPS server
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  
  https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`Chore Chart HTTPS server running on port ${HTTPS_PORT}`);
  });
}

// Always start HTTP server too
http.createServer(app).listen(PORT, () => {
  console.log(`Chore Chart HTTP server running on port ${PORT}`);
});
