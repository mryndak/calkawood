/**
 * Test integracyjny endpointu POST /api/wycena.
 *
 * Testowane scenariusze:
 * - Happy path (valid FormData → 200 + success)
 * - Walidacja (brak wymaganych pól → 400 + field errors)
 * - Rate limiting (6 zapytań z tego samego IP → 5 przechodzi, 6. dostaje 429)
 * - Honeypot (wypełnione pole website → 200 bez zapisu do DB)
 *
 * Validates: Requirements 7.1, 7.2, 7.7, 7.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetRateLimitStore } from '@/lib/rate-limit';

// --- Mocks ---

vi.mock('@/lib/db', () => ({
  saveQuoteRequest: vi.fn().mockResolvedValue(42),
}));

vi.mock('@/lib/email', () => ({
  sendQuoteNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/upload', () => ({
  validateFile: vi.fn().mockReturnValue({ valid: true }),
  saveUploadedFile: vi.fn().mockResolvedValue('quotes/42/1-photo.jpg'),
  MAX_FILES: 5,
}));

// Import po mockach
import { POST } from '@/pages/api/wycena';
import { saveQuoteRequest } from '@/lib/db';
import { sendQuoteNotification } from '@/lib/email';

// --- Helpers ---

function createMockFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

function createMockRequest(formData: FormData): Request {
  return new Request('http://localhost/api/wycena', {
    method: 'POST',
    body: formData,
  });
}

const VALID_FORM_DATA: Record<string, string> = {
  usluga: 'taras',
  powierzchnia: '38',
  material: 'sosna',
  termin: 'asap',
  telefon: '+48 123 456 789',
  imie: 'Jan',
  email: 'jan@example.com',
  zgoda_rodo: 'true',
};

// --- Tests ---

describe('POST /api/wycena — integration', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.clearAllMocks();
  });

  describe('Happy path', () => {
    it('zwraca 200 z success i id przy poprawnych danych', async () => {
      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '192.168.1.1',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ success: true, id: 42 });
    });

    it('wywołuje saveQuoteRequest z poprawnymi danymi', async () => {
      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '192.168.1.2',
      } as Parameters<typeof POST>[0]);

      expect(saveQuoteRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          usluga: 'taras',
          powierzchnia: 38,
          material: 'sosna',
          termin: 'asap',
          telefon: '+48 123 456 789',
          imie: 'Jan',
          email: 'jan@example.com',
          files: [],
          ip_address: '192.168.1.2',
        }),
      );
    });

    it('wywołuje sendQuoteNotification po zapisie do DB', async () => {
      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '192.168.1.3',
      } as Parameters<typeof POST>[0]);

      expect(sendQuoteNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 42,
          usluga: 'taras',
          imie: 'Jan',
        }),
      );
    });
  });

  describe('Walidacja', () => {
    it('zwraca 400 z błędami pól gdy brak wymaganego pola material', async () => {
      const { material, ...dataWithoutMaterial } = VALID_FORM_DATA;
      const formData = createMockFormData(dataWithoutMaterial);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '10.0.0.1',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.material).toBeDefined();
    });

    it('zwraca 400 gdy powierzchnia jest poza zakresem 10–250 m²', async () => {
      const formData = createMockFormData({ ...VALID_FORM_DATA, powierzchnia: '999' });
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '10.0.0.2',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.powierzchnia).toBeDefined();
    });

    it('zwraca 400 gdy brak zgody RODO', async () => {
      const { zgoda_rodo, ...dataWithoutRodo } = VALID_FORM_DATA;
      const formData = createMockFormData(dataWithoutRodo);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '10.0.0.3',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
    });

    it('nie wywołuje saveQuoteRequest przy błędzie walidacji', async () => {
      const formData = createMockFormData({ usluga: 'nieistniejaca' });
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '10.0.0.4',
      } as Parameters<typeof POST>[0]);

      expect(saveQuoteRequest).not.toHaveBeenCalled();
    });
  });

  describe('Rate limiting', () => {
    it('pozwala na 5 zapytań i blokuje 6. z tego samego IP (429)', async () => {
      const ip = '172.16.0.1';

      // Pierwsze 5 zapytań powinno przejść
      for (let i = 0; i < 5; i++) {
        const formData = createMockFormData(VALID_FORM_DATA);
        const request = createMockRequest(formData);

        const response = await POST({
          request,
          clientAddress: ip,
        } as Parameters<typeof POST>[0]);

        expect(response.status).toBe(200);
      }

      // 6. zapytanie — rate limit
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

    it('różne IP mają niezależne limity', async () => {
      // 5 zapytań z IP A
      for (let i = 0; i < 5; i++) {
        const formData = createMockFormData(VALID_FORM_DATA);
        const request = createMockRequest(formData);
        await POST({
          request,
          clientAddress: '10.10.10.1',
        } as Parameters<typeof POST>[0]);
      }

      // 1 zapytanie z IP B — powinno przejść
      const formData = createMockFormData(VALID_FORM_DATA);
      const request = createMockRequest(formData);

      const response = await POST({
        request,
        clientAddress: '10.10.10.2',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(200);
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
        clientAddress: '203.0.113.1',
      } as Parameters<typeof POST>[0]);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('nie wywołuje saveQuoteRequest gdy honeypot jest wypełniony', async () => {
      const formData = createMockFormData({
        ...VALID_FORM_DATA,
        website: 'spam',
      });
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '203.0.113.2',
      } as Parameters<typeof POST>[0]);

      expect(saveQuoteRequest).not.toHaveBeenCalled();
    });

    it('nie wywołuje sendQuoteNotification gdy honeypot jest wypełniony', async () => {
      const formData = createMockFormData({
        ...VALID_FORM_DATA,
        website: 'bot-link',
      });
      const request = createMockRequest(formData);

      await POST({
        request,
        clientAddress: '203.0.113.3',
      } as Parameters<typeof POST>[0]);

      expect(sendQuoteNotification).not.toHaveBeenCalled();
    });
  });
});
