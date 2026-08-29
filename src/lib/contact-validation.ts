import { z } from 'zod';

export const contactRequestSchema = z.object({
  imie: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  telefon: z.string().regex(/^\+?48?\s?\d{3}\s?\d{3}\s?\d{3}$/, 'Nieprawidłowy numer telefonu'),
  wiadomosc: z
    .string()
    .min(10, 'Wiadomość musi mieć minimum 10 znaków')
    .max(2000, 'Wiadomość może mieć maksymalnie 2000 znaków'),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
