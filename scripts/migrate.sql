-- CalkaWood: Migracja bazy danych
-- Tabela zapytań wycenowych (quote_requests)

CREATE TABLE quote_requests (
  id            SERIAL PRIMARY KEY,
  usluga        VARCHAR(50) NOT NULL CHECK (usluga IN ('stolarka-na-wymiar', 'tarasy', 'podlogi-i-wnetrza', 'budowa-szkieletowa')),
  opis          TEXT NOT NULL CHECK (char_length(opis) >= 20),
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
