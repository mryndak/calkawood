import { Resend } from 'resend';
import type { QuoteRequest } from './quote-validation';
import type { ContactRequest } from './contact-validation';
import { SERVICE_LABELS, MATERIAL_LABELS, TERM_LABELS, formatEstimateRange, estimateRange } from './estimate';

// Leniwa inicjalizacja klienta — konstruktor Resend rzuca synchronicznie,
// gdy brakuje klucza API. Wywołanie go dopiero przy wysyłce (nie na
// poziomie modułu) sprawia, że brakujący/błędny klucz kończy się zwykłym
// odrzuceniem promise w miejscu wywołania (obsługiwanym przez try/catch
// wywołujących), a nie awarią całego modułu przy imporcie.
let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(import.meta.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Wysyła powiadomienie email o nowym zapytaniu wycenowym.
 * Nie rzuca wyjątków — błędy są logowane, ale nie blokują odpowiedzi klienta.
 */
export async function sendQuoteNotification(
  quote: QuoteRequest & { id: number }
): Promise<boolean> {
  try {
    const serviceLabel = SERVICE_LABELS[quote.usluga] ?? quote.usluga;
    const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'wycena@calkawood.pl';

    const html = buildNotificationHtml(quote, serviceLabel);

    await getResendClient().emails.send({
      from: fromEmail,
      to: fromEmail,
      subject: `Nowe zapytanie wycenowe #${quote.id} — ${serviceLabel}`,
      html,
    });

    return true;
  } catch (error) {
    console.error('[Email] Nie udało się wysłać powiadomienia dla wyceny', quote.id, error);
    return false;
  }
}

function buildNotificationHtml(
  quote: QuoteRequest & { id: number },
  serviceLabel: string
): string {
  const range = estimateRange(quote.usluga, quote.powierzchnia, quote.material);

  const rows: Array<[string, string | undefined]> = [
    ['ID', String(quote.id)],
    ['Usługa', serviceLabel],
    ['Powierzchnia', `${quote.powierzchnia} m²`],
    ['Materiał', MATERIAL_LABELS[quote.material]],
    ['Termin', TERM_LABELS[quote.termin]],
    ['Widełki cenowe', formatEstimateRange(range)],
    ['Imię', quote.imie],
    ['Telefon', quote.telefon],
    ['Email', quote.email],
    ['Opis miejsca', quote.opis],
  ];

  const tableRows = rows
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;">${label}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(value!)}</td></tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="font-size:20px;color:#1e40af;">Nowe zapytanie wycenowe #${quote.id}</h1>
  <p style="color:#64748b;">Klient wypełnił formularz wyceny online na stronie CalkaWood.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    ${tableRows}
  </table>
  <p style="margin-top:24px;font-size:14px;color:#64748b;">
    Odpowiedz klientowi w ciągu 24 godzin. Telefon: <a href="tel:${escapeHtml(quote.telefon)}">${escapeHtml(quote.telefon)}</a>
  </p>
</body>
</html>`.trim();
}

/**
 * Wysyła powiadomienie email o nowej wiadomości z formularza kontaktowego.
 * W przeciwieństwie do sendQuoteNotification, brak zapisu w bazie jako
 * fallbacku — błąd wysyłki oznacza utratę wiadomości, więc funkcja rzuca
 * wyjątek zamiast go połykać (wywołujący musi to obsłużyć i poinformować
 * użytkownika, żeby zadzwonił zamiast pisać ponownie).
 */
export async function sendContactNotification(contact: ContactRequest): Promise<void> {
  const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'wycena@calkawood.pl';

  const html = buildContactNotificationHtml(contact);

  await getResendClient().emails.send({
    from: fromEmail,
    to: fromEmail,
    subject: `Nowa wiadomość z formularza kontaktowego — ${contact.imie}`,
    html,
  });
}

function buildContactNotificationHtml(contact: ContactRequest): string {
  const rows: Array<[string, string]> = [
    ['Imię', contact.imie],
    ['Telefon', contact.telefon],
    ['Wiadomość', contact.wiadomosc],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;">${label}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="font-size:20px;color:#1e40af;">Nowa wiadomość z formularza kontaktowego</h1>
  <p style="color:#64748b;">Klient napisał przez formularz kontaktowy na stronie CalkaWood.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    ${tableRows}
  </table>
  <p style="margin-top:24px;font-size:14px;color:#64748b;">
    Odpowiedz klientowi. Telefon: <a href="tel:${escapeHtml(contact.telefon)}">${escapeHtml(contact.telefon)}</a>
  </p>
</body>
</html>`.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
