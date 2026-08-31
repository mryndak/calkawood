-- Up Migration

-- Odtwarza migrację, która miała zostać uruchomiona ręcznie na produkcji
-- przed wdrożeniem redesignu z 29.08 (commit ec29edd, patrz usunięty
-- scripts/migrate-002-wycena-widelki.sql), ale nigdy nie została
-- zastosowana — stąd seria błędów "column ... does not exist"
-- (najpierw powierzchnia, teraz material; termin byłby kolejny).
--
-- Najpierw remapuj wiersze ze starej taksonomii usluga (sprzed redesignu)
-- na nową — inaczej ALTER ... ADD CONSTRAINT niżej odrzuci istniejące dane.
UPDATE quote_requests SET usluga = 'wnetrza'    WHERE usluga = 'podlogi-i-wnetrza';
UPDATE quote_requests SET usluga = 'domy'       WHERE usluga = 'budowa-szkieletowa';
UPDATE quote_requests SET usluga = 'taras'      WHERE usluga = 'tarasy';
UPDATE quote_requests SET usluga = 'zadaszenie' WHERE usluga = 'stolarka-na-wymiar';

ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_usluga_check;
ALTER TABLE quote_requests ADD CONSTRAINT quote_requests_usluga_check
  CHECK (usluga IN ('domy', 'sauna', 'taras', 'zadaszenie', 'wnetrza'));

ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_opis_check;
ALTER TABLE quote_requests ALTER COLUMN opis DROP NOT NULL;

ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS material VARCHAR(20)
  CHECK (material IN ('sosna', 'modrzew', 'kompozyt', 'dab'));
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS termin VARCHAR(10)
  CHECK (termin IN ('asap', '1-3', '3-6', 'orient'));

-- powierzchnia już dodana przez 1788197925463_fix-quote-requests-powierzchnia-column

-- Down Migration

ALTER TABLE quote_requests DROP COLUMN IF EXISTS material;
ALTER TABLE quote_requests DROP COLUMN IF EXISTS termin;

ALTER TABLE quote_requests ALTER COLUMN opis SET NOT NULL;
ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_opis_check;
ALTER TABLE quote_requests ADD CONSTRAINT quote_requests_opis_check
  CHECK (char_length(opis) >= 20);

ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_usluga_check;
ALTER TABLE quote_requests ADD CONSTRAINT quote_requests_usluga_check
  CHECK (usluga IN ('stolarka-na-wymiar', 'tarasy', 'podlogi-i-wnetrza', 'budowa-szkieletowa'));