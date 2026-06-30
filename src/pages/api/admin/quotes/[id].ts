import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/admin-auth';
import { updateQuoteStatus, getQuoteById } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import type { QuoteStatus } from '@/lib/types';

const VALID_STATUSES: QuoteStatus[] = ['nowe', 'w trakcie', 'wycenione', 'odrzucone'];

/**
 * PATCH /api/admin/quotes/[id] — zmiana statusu zapytania wycenowego.
 * Body: { status: QuoteStatus }
 * Wymaga autentykacji administratora.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    if (!isAuthenticated(request)) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const id = parseInt(params.id ?? '', 10);
    if (isNaN(id) || id <= 0) {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe ID zapytania' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Parsuj body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowy format danych' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { status } = body as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as QuoteStatus)) {
      return new Response(
        JSON.stringify({
          error: `Nieprawidłowy status. Dozwolone wartości: ${VALID_STATUSES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Sprawdź czy zapytanie istnieje
    const quote = await getQuoteById(id);
    if (!quote) {
      return new Response(
        JSON.stringify({ error: 'Nie znaleziono zapytania wycenowego' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    await updateQuoteStatus(id, status as QuoteStatus);

    return new Response(
      JSON.stringify({ success: true, id, status }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
