import type { APIRoute } from 'astro';
import { contactRequestSchema } from '@/lib/contact-validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { isHoneypotFilled } from '@/lib/security';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { saveContactMessage } from '@/lib/db';
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

    // 4. reCAPTCHA — nieaktywna, dopóki RECAPTCHA_SECRET_KEY nie jest ustawiony
    const recaptchaOk = await verifyRecaptcha(body['g-recaptcha-response'], clientAddress);
    if (!recaptchaOk) {
      return new Response(
        JSON.stringify({ error: 'Potwierdź, że nie jesteś robotem, i spróbuj ponownie.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 5. Validate with Zod
    const result = contactRequestSchema.safeParse(body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({ errors: fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 6. Save to database — widoczna w /admin/kontakt niezależnie od wysyłki maila
    const messageId = await saveContactMessage({
      ...result.data,
      ip_address: clientAddress,
    });

    // 7. Send email notification (non-blocking on failure — wiadomość już zapisana)
    try {
      await sendContactNotification({ ...result.data, id: messageId });
    } catch (emailError) {
      console.error('[Email] Nie udało się wysłać powiadomienia o wiadomości kontaktowej', messageId, emailError);
    }

    // 8. Return success
    return new Response(
      JSON.stringify({ success: true, id: messageId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
