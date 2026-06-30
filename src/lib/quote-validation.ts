import { z } from 'zod';

export const SERVICE_CATEGORIES = ['stolarka-na-wymiar', 'tarasy', 'podlogi-i-wnetrza', 'budowa-szkieletowa'] as const;

export const quoteRequestSchema = z.object({
  usluga: z.enum(SERVICE_CATEGORIES),
  opis: z.string().min(20, 'Opis musi mieć minimum 20 znaków'),
  telefon: z.string().regex(/^\+?48?\s?\d{3}\s?\d{3}\s?\d{3}$/, 'Nieprawidłowy numer telefonu'),
  imie: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  email: z.string().email('Nieprawidłowy adres email'),
  powiat: z.string().optional(),
  zgoda_rodo: z.preprocess(
    (val) => val === 'true' || val === true ? true : val,
    z.literal(true, { errorMap: () => ({ message: 'Wymagana zgoda RODO' }) }),
  ),
  wymiary: z.string().optional(),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
