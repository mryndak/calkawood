-- CalkaWood: Migracja bazy danych
-- Tabela zapytań wycenowych (quote_requests)
--
-- Schemat dla NOWEJ instalacji (uwzględnia już migracje/002). Jeśli baza już
-- istnieje z wcześniejszą wersją tabeli, użyj zamiast tego
-- scripts/migrate-002-wycena-widelki.sql (ALTER, nie niszczy danych).

CREATE TABLE quote_requests (
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

-- Indeksy
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_created_at ON quote_requests(created_at DESC);
CREATE INDEX idx_quote_requests_usluga ON quote_requests(usluga);

-- Trigger automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
