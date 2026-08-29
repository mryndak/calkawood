import pl from './pl.json';

export type Translations = typeof pl;

/**
 * Rejestr treści per locale. Na razie tylko polski — dodanie angielskiego
 * to: utworzenie src/i18n/en.json o identycznym kształcie co pl.json,
 * dopisanie go tutaj oraz do `locales` w astro.config.mjs. TypeScript
 * (adnotacja Record<string, Translations>) wymusi wtedy ten sam kształt.
 */
const translations: Record<string, Translations> = { pl };

export type Locale = keyof typeof translations;

export const DEFAULT_LOCALE: Locale = 'pl';

/**
 * Zwraca treści dla danego locale. Przyjmuje dowolny string (np.
 * Astro.currentLocale), więc nieznane/brakujące locale bezpiecznie
 * spadają na domyślny (polski) zamiast rzucać wyjątek.
 */
export function getTranslations(locale?: string | null): Translations {
  if (locale && locale in translations) {
    return translations[locale as Locale];
  }
  return translations[DEFAULT_LOCALE];
}

export default translations.pl;
