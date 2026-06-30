import type { QuoteRequest, ServiceCategory } from './quote-validation';

export type QuoteStatus = 'nowe' | 'w trakcie' | 'wycenione' | 'odrzucone';

export interface QuoteRequestRow {
  id: number;
  usluga: ServiceCategory;
  opis: string;
  telefon: string;
  imie: string;
  email: string;
  powiat: string | null;
  wymiary: string | null;
  status: QuoteStatus;
  zdjecia: string[];
  ip_address: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuoteListItem {
  id: number;
  imie: string;
  telefon: string;
  usluga: ServiceCategory;
  status: QuoteStatus;
  created_at: Date;
}

// Re-export for convenience
export type { QuoteRequest, ServiceCategory };
