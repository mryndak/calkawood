-- Up Migration

-- `quote_requests` istniała na produkcji już przed dodaniem kolumny
-- `powierzchnia` do schematu (2026-08-29), a init-migracja używa
-- `CREATE TABLE IF NOT EXISTS` — dla istniejącej tabeli to no-op, więc
-- kolumna nigdy tam nie powstała. Efekt: `column "powierzchnia" does
-- not exist` przy każdym odczycie/zapisie wycen (w tym na /admin).
ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS powierzchnia SMALLINT CHECK (powierzchnia BETWEEN 10 AND 250);

-- Down Migration

ALTER TABLE quote_requests DROP COLUMN IF EXISTS powierzchnia;