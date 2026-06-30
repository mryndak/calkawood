/**
 * Moduł autentykacji panelu admina.
 *
 * Sprawdza obecność cookie sesji administratora.
 * Cookie ustawiane jest po zalogowaniu hasłem z ADMIN_PASSWORD.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'admin_session';
const ADMIN_COOKIE_NAME = SESSION_COOKIE_NAME;

/** Przechowywanie aktywnych sesji (in-memory, wystarczające dla single-instance) */
const activeSessions = new Set<string>();

/**
 * Weryfikuje hasło administratora (timing-safe comparison).
 */
export function verifyPassword(input: string, expected: string): boolean {
  if (!input || !expected) return false;
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

/**
 * Tworzy nową sesję admina i zwraca token.
 */
export function createSession(): string {
  const token = randomBytes(32).toString('hex');
  activeSessions.add(token);
  return token;
}

/**
 * Zwraca nagłówek Set-Cookie dla sesji admina.
 */
export function getSessionCookieHeader(token: string): string {
  return `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;
}

/**
 * Sprawdza czy token sesji jest aktywny.
 */
export function isValidSession(token: string | undefined): boolean {
  if (!token || token.length === 0) return false;
  return activeSessions.has(token);
}

/**
 * Sprawdza czy żądanie pochodzi od uwierzytelnionego administratora.
 * Weryfikuje obecność cookie sesji admina i waliduje token.
 */
export function isAuthenticated(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const sessionValue = cookies[ADMIN_COOKIE_NAME];

  if (typeof sessionValue !== 'string' || sessionValue.length === 0) return false;
  return activeSessions.has(sessionValue);
}

/**
 * Usuwa sesję z aktywnych (wylogowanie).
 */
export function destroySession(token: string | undefined): void {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Zwraca nagłówek Set-Cookie usuwający ciasteczko sesji (wylogowanie).
 */
export function getClearSessionCookieHeader(): string {
  return `${ADMIN_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * Parsuje nagłówek Cookie na mapę klucz-wartość.
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(';')) {
    const [rawKey, ...valueParts] = pair.split('=');
    const key = rawKey?.trim();
    const value = valueParts.join('=').trim();
    if (key) {
      cookies[key] = value;
    }
  }

  return cookies;
}
