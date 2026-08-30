-- Up Migration

-- Tabela wiadomości z formularza kontaktowego (/kontakt), widoczna w
-- /admin/kontakt. Reużywa funkcji update_updated_at() z migracji
-- init-quote-requests.

CREATE TABLE contact_messages (
  id            SERIAL PRIMARY KEY,
  imie          VARCHAR(100) NOT NULL,
  telefon       VARCHAR(20) NOT NULL,
  wiadomosc     TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'nowa' CHECK (status IN ('nowa', 'odpowiedziano')),
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);

CREATE TRIGGER trigger_contact_messages_updated_at
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Down Migration

DROP TABLE IF EXISTS contact_messages;
