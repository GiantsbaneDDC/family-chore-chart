-- Create user and database for chore chart
-- Run with: sudo -u postgres psql -f setup-db.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'chorechart') THEN
        CREATE USER chorechart WITH PASSWORD 'chorechart';
    END IF;
END
$$;

SELECT 'CREATE DATABASE chorechart OWNER chorechart'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chorechart')\gexec

GRANT ALL PRIVILEGES ON DATABASE chorechart TO chorechart;

\c chorechart

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO chorechart;

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#4dabf7',
    avatar VARCHAR(10) NOT NULL DEFAULT '👤',
    pin VARCHAR(4) NOT NULL,
    allowance_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chores table
CREATE TABLE IF NOT EXISTS chores (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '📋',
    points INT NOT NULL DEFAULT 1,
    money_value DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Assignments table (which chores are assigned to which member on which day)
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    chore_id INT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(chore_id, member_id, day_of_week)
);

-- Completions table (tracking when assignments are completed)
CREATE TABLE IF NOT EXISTS completions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(assignment_id, week_start)
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Allowance history table (for tracking payouts)
CREATE TABLE IF NOT EXISTS allowance_history (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allowance_history_member ON allowance_history(member_id);
CREATE INDEX IF NOT EXISTS idx_allowance_history_created ON allowance_history(created_at);

-- Insert default admin PIN if not exists
INSERT INTO admin_settings (key, value) 
VALUES ('admin_pin', '1234')
ON CONFLICT (key) DO NOTHING;

-- Allowance enabled setting
INSERT INTO admin_settings (key, value) 
VALUES ('allowance_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Allowance jar max setting (for visual fill level)
INSERT INTO admin_settings (key, value) 
VALUES ('allowance_jar_max', '10')
ON CONFLICT (key) DO NOTHING;

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    member_id INT REFERENCES family_members(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    points_value INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Member achievements (earned badges)
CREATE TABLE IF NOT EXISTS member_achievements (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    achievement_key VARCHAR(100) NOT NULL REFERENCES achievements(key) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(member_id, achievement_key)
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_member ON analytics_events(member_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_member_achievements_member ON member_achievements(member_id);

-- Seed default achievements
INSERT INTO achievements (key, title, description, icon, points_value) VALUES
    ('first_chore', 'First Step', 'Complete your first chore', '🌱', 10),
    ('perfect_day', 'Perfect Day', 'Complete all chores in one day', '⭐', 25),
    ('perfect_week', 'Perfect Week', 'Complete all chores in a week', '🏆', 100),
    ('streak_3', 'On Fire', '3 week streak of completing all chores', '🔥', 50),
    ('streak_5', 'Unstoppable', '5 week streak of completing all chores', '💪', 100),
    ('early_bird', 'Early Bird', 'Complete a chore before 9am', '🐦', 15),
    ('night_owl', 'Night Owl', 'Complete a chore after 8pm', '🦉', 15),
    ('points_50', 'Half Century', 'Earn 50 points in a week', '🎯', 25),
    ('points_100', 'Century', 'Earn 100 points in a week', '💯', 50)
ON CONFLICT (key) DO NOTHING;

-- Grant table permissions
ALTER TABLE family_members OWNER TO chorechart;
ALTER TABLE chores OWNER TO chorechart;
ALTER TABLE assignments OWNER TO chorechart;
ALTER TABLE completions OWNER TO chorechart;
ALTER TABLE admin_settings OWNER TO chorechart;
ALTER TABLE analytics_events OWNER TO chorechart;
ALTER TABLE achievements OWNER TO chorechart;
ALTER TABLE member_achievements OWNER TO chorechart;
