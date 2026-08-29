-- CalkaWood: Migracja 002 — nowy kreator wyceny z widełkami cenowymi
--
-- UWAGA: Uruchom to ręcznie na bazie produkcyjnej/staging PRZED wdrożeniem
-- nowej wersji strony. Zmienia kształt formularza wyceny (6 pytań zamiast
-- swobodnego opisu): dodaje pola powierzchnia/material/termin, zwalnia opis
-- z wymogu min. 20 znaków (staje się opcjonalnym opisem miejsca), zmienia
-- dozwolone wartości kolumny usluga na nową taksonomię kreatora
-- (domy/sauna/taras/zadaszenie/wnetrza — osobną od kategorii realizacji).
--
-- Kolumny powiat i wymiary NIE są usuwane (zachowują dotychczasowe dane),
-- po prostu nowy formularz ich już nie wypełnia.
--
-- Istniejące wiersze z kategorią usluga sprzed migracji (stolarka-na-wymiar,
-- podlogi-i-wnetrza, budowa-szkieletowa, "tarasy") NIE spełnią nowego
-- CHECK — przed ALTER TABLE zmapuj je ręcznie na nową taksonomię, np.:
--
--   UPDATE quote_requests SET usluga = 'wnetrza'  WHERE usluga = 'podlogi-i-wnetrza';
--   UPDATE quote_requests SET usluga = 'domy'     WHERE usluga = 'budowa-szkieletowa';
--   UPDATE quote_requests SET usluga = 'taras'    WHERE usluga = 'tarasy';
--   UPDATE quote_requests SET usluga = 'zadaszenie' WHERE usluga = 'stolarka-na-wymiar';
--
-- (dobierz mapowanie do realnych danych — powyższe to tylko przykład).

ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_usluga_check;
ALTER TABLE quote_requests ADD CONSTRAINT quote_requests_usluga_check
  CHECK (usluga IN ('domy', 'sauna', 'taras', 'zadaszenie', 'wnetrza'));

ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_opis_check;
ALTER TABLE quote_requests ALTER COLUMN opis DROP NOT NULL;

ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS powierzchnia SMALLINT
  CHECK (powierzchnia BETWEEN 10 AND 250);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS material VARCHAR(20)
  CHECK (material IN ('sosna', 'modrzew', 'kompozyt', 'dab'));
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS termin VARCHAR(10)
  CHECK (termin IN ('asap', '1-3', '3-6', 'orient'));
