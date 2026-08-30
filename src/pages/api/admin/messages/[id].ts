import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/admin-auth';
import { updateContactStatus, getContactMessageById } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import type { ContactStatus } from '@/lib/types';

const VALID_STATUSES: ContactStatus[] = ['nowa', 'odpowiedziano'];

/**
 * PATCH /api/admin/messages/[id] — zmiana statusu wiadomości kontaktowej.
 * Body: { status: ContactStatus }
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
        JSON.stringify({ error: 'Nieprawidłowe ID wiadomości' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

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

    if (!status || !VALID_STATUSES.includes(status as ContactStatus)) {
      return new Response(
        JSON.stringify({
          error: `Nieprawidłowy status. Dozwolone wartości: ${VALID_STATUSES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const message = await getContactMessageById(id);
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Nie znaleziono wiadomości' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    await updateContactStatus(id, status as ContactStatus);

    return new Response(
      JSON.stringify({ success: true, id, status }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
