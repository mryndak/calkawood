import type { QuoteRequest, ServiceCategory } from './quote-validation';
import type { EstimateMaterial, EstimateTerm } from './estimate';

export type QuoteStatus = 'nowe' | 'w trakcie' | 'wycenione' | 'odrzucone';

export interface QuoteRequestRow {
  id: number;
  usluga: ServiceCategory;
  powierzchnia: number;
  material: EstimateMaterial;
  termin: EstimateTerm;
  opis: string | null;
  telefon: string;
  imie: string;
  email: string;
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
