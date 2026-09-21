-- Up Migration

-- Proste ustawienia klucz-wartość sterowane z panelu /admin/ustawienia.
-- quote_calculator_enabled: czy na stronie głównej widoczny jest kalkulator
-- wyceny (przycisk w hero + sekcja QuoteCTA). Domyślnie wyłączony.

CREATE TABLE IF NOT EXISTS site_settings (
  key         VARCHAR(50) PRIMARY KEY,
  value       VARCHAR(255) NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value)
VALUES ('quote_calculator_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Down Migration

DROP TABLE IF EXISTS site_settings;
