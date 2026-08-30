import postgres from 'postgres';
import type { QuoteRequest } from './quote-validation';
import type { ContactRequest } from './contact-validation';
import type { QuoteRequestRow, QuoteStatus, ContactMessageRow, ContactStatus } from './types';

const sql = postgres(import.meta.env.DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Zapisuje nowe zapytanie wycenowe i zwraca przypisane ID.
 */
export async function saveQuoteRequest(
  data: QuoteRequest & { files: string[]; ip_address?: string }
): Promise<number> {
  const [row] = await sql`
    INSERT INTO quote_requests (
      usluga, powierzchnia, material, termin, opis, telefon, imie, email, zdjecia, ip_address
    ) VALUES (
      ${data.usluga},
      ${data.powierzchnia},
      ${data.material},
      ${data.termin},
      ${data.opis ?? null},
      ${data.telefon},
      ${data.imie},
      ${data.email},
      ${data.files},
      ${data.ip_address ?? null}
    )
    RETURNING id
  `;

  return row.id as number;
}

/**
 * Pobiera listę zapytań wycenowych posortowaną od najnowszych.
 */
export async function getQuoteRequests(options: {
  limit: number;
  offset: number;
}): Promise<QuoteRequestRow[]> {
  const rows = await sql<QuoteRequestRow[]>`
    SELECT
      id, usluga, powierzchnia, material, termin, opis, telefon, imie, email,
      status, zdjecia, ip_address,
      created_at, updated_at
    FROM quote_requests
    ORDER BY created_at DESC
    LIMIT ${options.limit}
    OFFSET ${options.offset}
  `;

  return rows;
}

/**
 * Zwraca łączną liczbę zapytań wycenowych.
 */
export async function getQuoteRequestsCount(): Promise<number> {
  const [row] = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM quote_requests
  `;

  return parseInt(row.count, 10);
}

/**
 * Aktualizuje status zapytania wycenowego.
 */
export async function updateQuoteStatus(
  id: number,
  status: QuoteStatus
): Promise<void> {
  await sql`
    UPDATE quote_requests
    SET status = ${status}
    WHERE id = ${id}
  `;
}

/**
 * Pobiera pojedyncze zapytanie wycenowe po ID. Zwraca null jeśli nie znaleziono.
 */
export async function getQuoteById(
  id: number
): Promise<QuoteRequestRow | null> {
  const rows = await sql<QuoteRequestRow[]>`
    SELECT
      id, usluga, powierzchnia, material, termin, opis, telefon, imie, email,
      status, zdjecia, ip_address,
      created_at, updated_at
    FROM quote_requests
    WHERE id = ${id}
  `;

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Zapisuje nową wiadomość z formularza kontaktowego i zwraca przypisane ID.
 */
export async function saveContactMessage(
  data: ContactRequest & { ip_address?: string }
): Promise<number> {
  const [row] = await sql`
    INSERT INTO contact_messages (imie, telefon, wiadomosc, ip_address)
    VALUES (${data.imie}, ${data.telefon}, ${data.wiadomosc}, ${data.ip_address ?? null})
    RETURNING id
  `;

  return row.id as number;
}

/**
 * Pobiera listę wiadomości kontaktowych posortowaną od najnowszych.
 */
export async function getContactMessages(options: {
  limit: number;
  offset: number;
}): Promise<ContactMessageRow[]> {
  const rows = await sql<ContactMessageRow[]>`
    SELECT id, imie, telefon, wiadomosc, status, ip_address, created_at, updated_at
    FROM contact_messages
    ORDER BY created_at DESC
    LIMIT ${options.limit}
    OFFSET ${options.offset}
  `;

  return rows;
}

/**
 * Zwraca łączną liczbę wiadomości kontaktowych.
 */
export async function getContactMessagesCount(): Promise<number> {
  const [row] = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM contact_messages
  `;

  return parseInt(row.count, 10);
}

/**
 * Aktualizuje status wiadomości kontaktowej (czy odpowiedziano).
 */
export async function updateContactStatus(
  id: number,
  status: ContactStatus
): Promise<void> {
  await sql`
    UPDATE contact_messages
    SET status = ${status}
    WHERE id = ${id}
  `;
}

/**
 * Pobiera pojedynczą wiadomość kontaktową po ID. Zwraca null jeśli nie znaleziono.
 */
export async function getContactMessageById(
  id: number
): Promise<ContactMessageRow | null> {
  const rows = await sql<ContactMessageRow[]>`
    SELECT id, imie, telefon, wiadomosc, status, ip_address, created_at, updated_at
    FROM contact_messages
    WHERE id = ${id}
  `;

  return rows.length > 0 ? rows[0] : null;
}

export default sql;
