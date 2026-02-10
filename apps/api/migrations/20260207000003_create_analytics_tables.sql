CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    uploads_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);