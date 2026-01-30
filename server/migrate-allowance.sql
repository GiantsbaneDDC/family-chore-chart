-- Migration: Add Allowance System
-- Run with: sudo -u postgres psql -d chorechart -f migrate-allowance.sql

-- Add money_value to chores table
ALTER TABLE chores ADD COLUMN IF NOT EXISTS money_value DECIMAL(10,2) DEFAULT NULL;

-- Add allowance_balance to family_members table
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS allowance_balance DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Create allowance_history table
CREATE TABLE IF NOT EXISTS allowance_history (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_allowance_history_member ON allowance_history(member_id);
CREATE INDEX IF NOT EXISTS idx_allowance_history_created ON allowance_history(created_at);

-- Add allowance settings
INSERT INTO admin_settings (key, value) 
VALUES ('allowance_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value) 
VALUES ('allowance_jar_max', '10')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
ALTER TABLE allowance_history OWNER TO chorechart;

SELECT 'Migration complete! Allowance system is ready.' as status;
