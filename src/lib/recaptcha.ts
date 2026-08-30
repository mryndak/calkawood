// Weryfikacja Google reCAPTCHA v2 (checkbox) po stronie serwera.
// Validates: ochrona formularzy kontakt/wycena przed botami.

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Sprawdza token reCAPTCHA przesłany z formularza.
 *
 * Dopóki RECAPTCHA_SECRET_KEY nie jest ustawiony (patrz .env.example),
 * captcha jest nieaktywna i funkcja zawsze zwraca true — formularze działają
 * wtedy tak jak przed jej wdrożeniem (honeypot + limit żądań).
 */
export async function verifyRecaptcha(token: unknown, remoteIp?: string): Promise<boolean> {
  const secret = import.meta.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;

  if (typeof token !== 'string' || token.length === 0) return false;

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.set('remoteip', remoteIp);

  try {
    const response = await fetch(VERIFY_URL, { method: 'POST', body: params });
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('[reCAPTCHA] Weryfikacja nie powiodła się', error);
    return false;
  }
}
