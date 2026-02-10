-- Add reporting columns for community moderation
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS report_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add cultural_context for Wikipedia enrichment
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS cultural_context TEXT;

-- Index for finding reported items efficiently
CREATE INDEX IF NOT EXISTS idx_letterings_reported ON letterings(report_count) WHERE report_count > 0;
