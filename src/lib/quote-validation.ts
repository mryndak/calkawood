import { z } from 'zod';
import { SERVICE_TYPES, MATERIALS, TERMS, MIN_AREA, MAX_AREA } from './estimate';

// Zachowana nazwa dla zgodności z resztą kodu (formularz, testy) — wartości
// odpowiadają kategoriom kreatora wyceny (src/lib/estimate.ts), osobnym od
// kategorii realizacji (src/content.config.ts).
export const SERVICE_CATEGORIES = SERVICE_TYPES;

export const quoteRequestSchema = z.object({
  usluga: z.enum(SERVICE_TYPES),
  powierzchnia: z.coerce
    .number({ invalid_type_error: 'Podaj powierzchnię' })
    .min(MIN_AREA, `Powierzchnia musi być co najmniej ${MIN_AREA} m²`)
    .max(MAX_AREA, `Powierzchnia może być maksymalnie ${MAX_AREA} m²`),
  material: z.enum(MATERIALS),
  termin: z.enum(TERMS),
  // Opis miejsca — krok 5, nieobowiązkowy
  opis: z.string().max(2000, 'Opis może mieć maksymalnie 2000 znaków').optional(),
  telefon: z.string().regex(/^\+?48?\s?\d{3}\s?\d{3}\s?\d{3}$/, 'Nieprawidłowy numer telefonu'),
  imie: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  email: z.string().email('Nieprawidłowy adres email'),
  zgoda_rodo: z.preprocess(
    (val) => val === 'true' || val === true ? true : val,
    z.literal(true, { errorMap: () => ({ message: 'Wymagana zgoda na kontakt' }) }),
  ),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type ServiceCategory = (typeof SERVICE_TYPES)[number];
