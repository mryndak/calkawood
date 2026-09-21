import type { APIRoute } from 'astro';
import { isAuthenticated } from '@/lib/admin-auth';
import { setQuotePricing } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import { MATERIALS, SERVICE_TYPES, parsePricing } from '@/lib/estimate';

/**
 * POST /api/admin/pricing — zapis stawek i mnożników kalkulatora wyceny.
 * Pola formularza: rate_<usluga>_low, rate_<usluga>_high, mult_<material>.
 * Pole reset=1 przywraca wartości domyślne. Wymaga autentykacji administratora.
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

    if (form.get('reset') === '1') {
      await setQuotePricing(null);
      return new Response(null, { status: 303, headers: { Location: '/admin/ustawienia?saved=1' } });
    }

    const num = (key: string) => Number(String(form.get(key) ?? '').replace(',', '.'));
    const pricing = parsePricing({
      rates: Object.fromEntries(
        SERVICE_TYPES.map((s) => [s, [num(`rate_${s}_low`), num(`rate_${s}_high`)]]),
      ),
      multipliers: Object.fromEntries(MATERIALS.map((m) => [m, num(`mult_${m}`)])),
    });

    if (!pricing) {
      return new Response(null, { status: 303, headers: { Location: '/admin/ustawienia?error=pricing' } });
    }

    await setQuotePricing(pricing);
    return new Response(null, { status: 303, headers: { Location: '/admin/ustawienia?saved=1' } });
  } catch (error) {
    return handleApiError(error);
  }
};
