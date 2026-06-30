import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/admin-auth';
import { getQuoteRequests, getQuoteRequestsCount } from '@/lib/db';
import { handleApiError } from '@/lib/errors';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/admin/quotes — lista zapytań wycenowych z paginacją.
 * Wymaga autentykacji administratora.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    if (!isAuthenticated(request)) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const [quotes, total] = await Promise.all([
      getQuoteRequests({ limit, offset }),
      getQuoteRequestsCount(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return new Response(
      JSON.stringify({
        quotes,
        total,
        page,
        totalPages,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
