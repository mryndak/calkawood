/**
 * Test integracyjny endpointu POST /api/kontakt.
 *
 * Testowane scenariusze:
 * - Happy path (valid FormData → 200 + success, wysyłka emaila)
 * - Walidacja (brak/błędne pola → 400 + field errors)
 * - Rate limiting (6 zapytań z tego samego IP → 5 przechodzi, 6. dostaje 429)
 * - Honeypot (wypełnione pole website → 200 bez wysyłki emaila)
 * - Błąd wysyłki emaila → 502, użytkownik informowany zamiast fałszywego success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetRateLimitStore } from '@/lib/rate-limit';

// --- Mocks ---

vi.mock('@/lib/email', () => ({
  sendContactNotification: vi.fn().mockResolvedValue(undefined),
}));

// Import po mockach
import { POST } from '@/pages/api/kontakt';
import { sendContactNotification } from '@/lib/email';

// --- Helpers ---

function createMockFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

function createMockRequest(formData: FormData): Request {
  return new Request('http://localhost/api/kontakt', {
    method: 'POST',
    body: formData,
  });
}

const VALID_FORM_DATA: Record<string, string> = {
  imie: 'Jan',
  telefon: '+48 123 456 789',
  wiadomosc: 'Dzień dobry, chciałbym zapytać o wycenę tarasu.',
};

// --- Tests ---

describe('POST /api/kontakt — integration', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.clearAllMocks();
  });

  describe('Happy path', () => {
    it('zwraca 200 z success przy poprawnych danych', async () => {
      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '192.168.2.1',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it('wywołuje sendContactNotification z poprawnymi danymi', async () => {
      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '192.168.2.2',
      } as Parameters<typeof POST>[0]);

      expect(sendContactNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          imie: 'Jan',
          telefon: '+48 123 456 789',
          wiadomosc: 'Dzień dobry, chciałbym zapytać o wycenę tarasu.',
        }),
      );
    });
  });

  describe('Walidacja', () => {
    it('zwraca 400 gdy brak wymaganego pola wiadomosc', async () => {
      const { wiadomosc, ...dataWithoutMessage } = VALID_FORM_DATA;
      const formData = createMockFormData(dataWithoutMessage);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '10.0.1.1',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.wiadomosc).toBeDefined();
    });

    it('zwraca 400 gdy telefon ma nieprawidłowy format', async () => {
      const formData = createMockFormData({ ...VALID_FORM_DATA, telefon: 'abc' });
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '10.0.1.2',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.errors?.telefon).toBeDefined();
    });

    it('nie wywołuje sendContactNotification przy błędzie walidacji', async () => {
      const formData = createMockFormData({ imie: 'J' });
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '10.0.1.3',
      } as Parameters<typeof POST>[0]);

      expect(sendContactNotification).not.toHaveBeenCalled();
    });
  });

  describe('Rate limiting', () => {
    it('pozwala na 5 zapytań i blokuje 6. z tego samego IP (429)', async () => {
      const ip = '172.16.1.1';

      for (let i = 0; i < 5; i++) {
        const formData = createMockFormData(VALID_FORM_DATA);
        const request = createMockRequest(formData);

        const response = await POST({
          request,
          clientAddress: ip,
        } as Parameters<typeof POST>[0]);

        expect(response.status).toBe(200);
      }

      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: ip,
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error).toContain('Zbyt wiele zapytań');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Honeypot', () => {
    it('zwraca 200 z success: true gdy pole website jest wypełnione', async () => {
      const formData = createMockFormData({
        ...VALID_FORM_DATA,
        website: 'http://spam-bot.example.com',
      });
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '203.0.114.1',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('nie wywołuje sendContactNotification gdy honeypot jest wypełniony', async () => {
      const formData = createMockFormData({
        ...VALID_FORM_DATA,
        website: 'spam',
      });
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '203.0.114.2',
      } as Parameters<typeof POST>[0]);

      expect(sendContactNotification).not.toHaveBeenCalled();
    });
  });

  describe('Błąd wysyłki emaila', () => {
    it('zwraca 502 z komunikatem gdy sendContactNotification rzuci wyjątek', async () => {
      vi.mocked(sendContactNotification).mockRejectedValueOnce(new Error('Resend API down'));

      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '198.51.100.1',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(502);

      const body = await response.json();
      expect(body.error).toContain('zadzwoń');
    });
  });
});
