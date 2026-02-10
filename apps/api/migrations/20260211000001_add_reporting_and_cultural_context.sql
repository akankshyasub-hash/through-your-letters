ALTER TABLE letterings ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS report_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS cultural_context TEXT;

CREATE INDEX IF NOT EXISTS idx_letterings_reported ON letterings(report_count) WHERE report_count > 0;