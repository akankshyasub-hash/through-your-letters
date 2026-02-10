ALTER TABLE letterings ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_letterings_image_hash ON letterings(image_hash) WHERE image_hash IS NOT NULL;