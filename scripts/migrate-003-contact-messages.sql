-- CalkaWood: Migracja 003 — zapisywanie wiadomości z formularza kontaktowego
--
-- Formularz kontaktowy (/kontakt) dotąd tylko wysyłał e-mail i nie zostawiał
-- śladu w bazie. Ta migracja dodaje tabelę contact_messages, żeby wiadomości
-- były widoczne w panelu administracyjnym (/admin/kontakt) razem z prostym
-- statusem "czy odpowiedziano".
--
-- Wymaga funkcji update_updated_at() utworzonej w scripts/migrate.sql —
-- uruchom to po tamtej migracji, nie zamiast niej.

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
