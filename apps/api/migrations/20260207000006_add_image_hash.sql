ALTER TABLE letterings ADD COLUMN image_hash VARCHAR(64);

CREATE UNIQUE INDEX idx_letterings_image_hash ON letterings(image_hash) WHERE image_hash IS NOT NULL;
