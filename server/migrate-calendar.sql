-- Calendar events cache table
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location TEXT,
    description TEXT,
    color_id VARCHAR(10),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_id);

ALTER TABLE calendar_events OWNER TO chorechart;
