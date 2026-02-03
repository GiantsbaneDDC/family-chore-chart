-- Fitness Tracking Migration
-- Run with: psql -U chorechart -d chorechart -f migrate-fitness.sql

-- Activities catalog (types of activities)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '🏃',
    points INT NOT NULL DEFAULT 5,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs (when someone does an activity)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    activity_id INT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_mins INT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Family fitness goals
CREATE TABLE IF NOT EXISTS fitness_goals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    target_count INT NOT NULL DEFAULT 30,
    week_start DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    bonus_points INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fitness streaks tracking
CREATE TABLE IF NOT EXISTS fitness_streaks (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_member ON activity_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity ON activity_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_week ON fitness_goals(week_start);

-- Seed default activities
INSERT INTO activities (name, icon, points, category) VALUES
    ('Bike Ride', '🚴', 10, 'cardio'),
    ('Run / Jog', '🏃', 10, 'cardio'),
    ('Walk', '🚶', 5, 'cardio'),
    ('Dog Walk', '🐕', 5, 'cardio'),
    ('Swimming', '🏊', 10, 'cardio'),
    ('Sports / Games', '⚽', 10, 'sports'),
    ('Stretching', '🧘', 5, 'flexibility'),
    ('Yoga', '🧘‍♀️', 5, 'flexibility'),
    ('Dancing', '💃', 8, 'cardio'),
    ('Playground', '🛝', 5, 'play'),
    ('Trampoline', '🤸', 8, 'play'),
    ('Scooter / Skateboard', '🛴', 8, 'cardio'),
    ('Gym / Weights', '🏋️', 10, 'strength'),
    ('Martial Arts', '🥋', 10, 'sports'),
    ('Bush Walk / Hike', '🥾', 10, 'cardio')
ON CONFLICT DO NOTHING;

-- Fitness achievements
INSERT INTO achievements (key, title, description, icon, points_value) VALUES
    ('first_activity', 'Get Moving', 'Log your first activity', '🎬', 10),
    ('streak_7', 'Week Warrior', 'Exercise 7 days in a row', '🔥', 50),
    ('streak_14', 'Fortnight Fighter', 'Exercise 14 days in a row', '💪', 100),
    ('streak_30', 'Monthly Marvel', 'Exercise 30 days in a row', '🏅', 200),
    ('family_goal', 'Team Player', 'Help the family reach a weekly goal', '👨‍👩‍👧‍👦', 25),
    ('variety_5', 'All-Rounder', 'Try 5 different activities', '🌈', 30),
    ('early_workout', 'Rise & Shine', 'Log an activity before 8am', '🌅', 15),
    ('weekend_warrior', 'Weekend Warrior', 'Exercise both Saturday and Sunday', '🎉', 20)
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
ALTER TABLE activities OWNER TO chorechart;
ALTER TABLE activity_logs OWNER TO chorechart;
ALTER TABLE fitness_goals OWNER TO chorechart;
ALTER TABLE fitness_streaks OWNER TO chorechart;
