-- Up Migration

-- Ustawienie quote_pricing (stawki kalkulatora) to JSON dłuższy niż 255 znaków.
ALTER TABLE site_settings ALTER COLUMN value TYPE TEXT;

-- Down Migration

ALTER TABLE site_settings ALTER COLUMN value TYPE VARCHAR(255);
