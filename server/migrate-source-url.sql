-- Migration: Add source_url to recipes table
-- Run with: sudo -u postgres psql -d chorechart -f server/migrate-source-url.sql

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Index for faster URL lookups
CREATE INDEX IF NOT EXISTS idx_recipes_source_url ON recipes(source_url) WHERE source_url IS NOT NULL;
