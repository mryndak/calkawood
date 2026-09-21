import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/admin-auth';
import { setQuoteCalculatorEnabled } from '@/lib/db';
import { handleApiError } from '@/lib/errors';

/**
 * POST /api/admin/settings — włącza/wyłącza kalkulator wyceny na stronie głównej.
 * Formularz HTML: quote_calculator_enabled=on|(brak). Wymaga autentykacji.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    if (!isAuthenticated(request)) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const form = await request.formData();
    await setQuoteCalculatorEnabled(form.get('quote_calculator_enabled') === 'on');

    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/ustawienia?saved=1' },
    });
  } catch (error) {
    return handleApiError(error);
  }
};
