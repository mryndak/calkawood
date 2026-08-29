import type { APIRoute } from 'astro';
import { contactRequestSchema } from '@/lib/contact-validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { isHoneypotFilled } from '@/lib/security';
import { sendContactNotification } from '@/lib/email';
import { handleApiError } from '@/lib/errors';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    // 1. Rate limiting — osobny licznik niż /api/wycena (namespaced po IP)
    const rateCheck = checkRateLimit(`kontakt:${clientAddress}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: 'Zbyt wiele zapytań. Spróbuj ponownie później.' }),
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfter),
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    // 3. Honeypot check — silent discard for bots
    if (isHoneypotFilled(body as Record<string, unknown>)) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 4. Validate with Zod
    const result = contactRequestSchema.safeParse(body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({ errors: fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 5. Send email — brak zapisu do bazy jako fallbacku, więc błąd wysyłki
    // musi trafić do użytkownika (inaczej wiadomość ginie bez śladu).
    try {
      await sendContactNotification(result.data);
    } catch (emailError) {
      console.error('[Email] Nie udało się wysłać wiadomości kontaktowej', emailError);
      return new Response(
        JSON.stringify({ error: 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub zadzwoń.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 6. Return success
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
