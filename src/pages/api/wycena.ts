import type { APIRoute } from 'astro';
import { quoteRequestSchema } from '@/lib/quote-validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { isHoneypotFilled } from '@/lib/security';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { saveQuoteRequest } from '@/lib/db';
import { sendQuoteNotification } from '@/lib/email';
import { validateFile, saveUploadedFile, MAX_FILES } from '@/lib/upload';
import { handleApiError } from '@/lib/errors';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    // 1. Rate limiting
    const rateCheck = checkRateLimit(clientAddress, 5, 15 * 60 * 1000);
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
    const result = quoteRequestSchema.safeParse(body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({ errors: fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 6. Process file uploads
    const files = formData.getAll('zdjecia') as File[];
    if (files.length > MAX_FILES) {
      return new Response(
        JSON.stringify({ error: `Maksymalna liczba plików to ${MAX_FILES}.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Validate each file
    for (const file of files) {
      if (file.size === 0) continue; // skip empty file entries
      const validation = validateFile(file);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // 7. Save to database (get ID first for file paths)
    const quoteId = await saveQuoteRequest({
      ...result.data,
      files: [],
      ip_address: clientAddress,
    });

    // 8. Save uploaded files with quoteId
    const filePaths: string[] = [];
    for (const file of files) {
      if (file.size === 0) continue;
      const path = await saveUploadedFile(file, quoteId);
      filePaths.push(path);
    }

    // 9. Send email notification (non-blocking on failure)
    try {
      await sendQuoteNotification({ ...result.data, id: quoteId });
    } catch (emailError) {
      console.error('[Email] Failed to send notification for quote', quoteId, emailError);
    }

    // 10. Return success
    return new Response(
      JSON.stringify({ success: true, id: quoteId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
