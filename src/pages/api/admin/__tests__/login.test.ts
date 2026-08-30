import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetRateLimitStore } from '@/lib/rate-limit';

vi.mock('@/lib/admin-auth', () => ({
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  getSessionCookieHeader: vi.fn(),
}));

import { POST } from '../login';
import { verifyPassword, createSession, getSessionCookieHeader } from '@/lib/admin-auth';

const mockVerifyPassword = vi.mocked(verifyPassword);
const mockCreateSession = vi.mocked(createSession);
const mockGetSessionCookieHeader = vi.mocked(getSessionCookieHeader);

function createRequest(password: string): Request {
  const body = new URLSearchParams({ password });
  return new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

function createContext(request: Request, clientAddress: string) {
  return { request, clientAddress } as Parameters<typeof POST>[0];
}

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.clearAllMocks();
    // verifyPassword jest zamockowane, więc realna wartość nie ma znaczenia —
    // ważne tylko, żeby zmienna była ustawiona (inaczej login.ts odrzuca wcześniej).
    vi.stubEnv('ADMIN_PASSWORD', 'test-secret');
  });

  it('przekierowuje na /admin i ustawia cookie przy poprawnym haśle', async () => {
    mockVerifyPassword.mockReturnValue(true);
    mockCreateSession.mockReturnValue('token-123');
    mockGetSessionCookieHeader.mockReturnValue('admin_session=token-123; HttpOnly');

    const response = await POST(createContext(createRequest('correct'), '10.0.0.1'));

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/admin');
    expect(response.headers.get('Set-Cookie')).toBe('admin_session=token-123; HttpOnly');
  });

  it('przekierowuje z error=invalid przy błędnym haśle', async () => {
    mockVerifyPassword.mockReturnValue(false);

    const response = await POST(createContext(createRequest('wrong'), '10.0.0.2'));

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/admin/login?error=invalid');
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('blokuje po przekroczeniu limitu prób (429 → redirect z error=ratelimit)', async () => {
    mockVerifyPassword.mockReturnValue(false);
    const ip = '10.0.0.3';

    for (let i = 0; i < 5; i++) {
      const response = await POST(createContext(createRequest('wrong'), ip));
      expect(response.headers.get('Location')).toBe('/admin/login?error=invalid');
    }

    const response = await POST(createContext(createRequest('correct'), ip));

    expect(response.headers.get('Location')).toBe('/admin/login?error=ratelimit');
    // Nawet z poprawnym hasłem — limit blokuje zanim hasło jest sprawdzane.
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('różne IP mają niezależne limity', async () => {
    mockVerifyPassword.mockReturnValue(false);

    for (let i = 0; i < 5; i++) {
      await POST(createContext(createRequest('wrong'), '10.0.0.4'));
    }

    mockVerifyPassword.mockReturnValue(true);
    mockCreateSession.mockReturnValue('token-456');
    mockGetSessionCookieHeader.mockReturnValue('admin_session=token-456; HttpOnly');

    const response = await POST(createContext(createRequest('correct'), '10.0.0.5'));

    expect(response.headers.get('Location')).toBe('/admin');
  });
});
