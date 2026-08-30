-- Up Migration

-- Tabela zapytań wycenowych (kreator wyceny online, /wycena) i wspólna
-- funkcja triggera updated_at, reużywana też przez kolejne migracje.
--
-- Idempotentne DDL (IF NOT EXISTS / DROP TRIGGER IF EXISTS + CREATE) celowo —
-- pozwala bezpiecznie uruchomić migrację nawet na bazie, gdzie te obiekty
-- już istnieją z wcześniejszego ręcznego wdrożenia (bez tego node-pg-migrate
-- rzuca "relation already exists" i wymaga ręcznego --fake na serwerze).

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS quote_requests (
  id            SERIAL PRIMARY KEY,
  usluga        VARCHAR(50) NOT NULL CHECK (usluga IN ('domy', 'sauna', 'taras', 'zadaszenie', 'wnetrza')),
  powierzchnia  SMALLINT CHECK (powierzchnia BETWEEN 10 AND 250),
  material      VARCHAR(20) CHECK (material IN ('sosna', 'modrzew', 'kompozyt', 'dab')),
  termin        VARCHAR(10) CHECK (termin IN ('asap', '1-3', '3-6', 'orient')),
  opis          TEXT,
  telefon       VARCHAR(20) NOT NULL,
  imie          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  powiat        VARCHAR(100),
  wymiary       TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'nowe' CHECK (status IN ('nowe', 'w trakcie', 'wycenione', 'odrzucone')),
  zdjecia       TEXT[] DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_usluga ON quote_requests(usluga);

DROP TRIGGER IF EXISTS trigger_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER trigger_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Down Migration

DROP TABLE IF EXISTS quote_requests;
-- update_updated_at() celowo zostaje — używa jej też migracja contact-messages.
