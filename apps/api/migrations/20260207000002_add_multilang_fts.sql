ALTER TABLE letterings ADD COLUMN IF NOT EXISTS detected_text_tsv tsvector;

CREATE INDEX IF NOT EXISTS idx_letterings_fts ON letterings USING gin(detected_text_tsv);

CREATE OR REPLACE FUNCTION update_lettering_tsv() RETURNS trigger AS $$
BEGIN
    NEW.detected_text_tsv := to_tsvector('english', COALESCE(NEW.detected_text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS letterings_tsv_update ON letterings;
CREATE TRIGGER letterings_tsv_update BEFORE INSERT OR UPDATE ON letterings
FOR EACH ROW EXECUTE FUNCTION update_lettering_tsv();