/**
 * In-memory rate limiting module.
 * Ogranicza liczbę zapytań per IP w zadanym oknie czasowym.
 * Wystarczający dla single-instance na MyDevil; restart czyści stan (akceptowalne).
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

const DEFAULT_MAX_REQUESTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minut

const store = new Map<string, RateLimitEntry>();

/**
 * Sprawdza czy dany IP może wykonać kolejne zapytanie.
 *
 * @param ip - Adres IP klienta
 * @param maxRequests - Maksymalna liczba zapytań w oknie (domyślnie 5)
 * @param windowMs - Długość okna czasowego w ms (domyślnie 15 minut)
 * @returns Obiekt z flagą `allowed` i opcjonalnym `retryAfter` (sekundy do resetu)
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();

  // Lazy cleanup — usuwamy wygasłe wpisy przy każdym wywołaniu
  cleanupExpiredEntries(now);

  const entry = store.get(ip);

  // Brak wpisu lub okno wygasło — resetuj
  if (!entry || now > entry.resetAt) {
    store.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true };
  }

  // Wpis istnieje i okno nadal aktywne
  if (entry.count < maxRequests) {
    entry.count += 1;
    return { allowed: true };
  }

  // Limit przekroczony
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, retryAfter };
}

/**
 * Usuwa wygasłe wpisy ze store.
 * Wywoływane leniwie przy każdym sprawdzeniu rate limit.
 */
function cleanupExpiredEntries(now: number): void {
  for (const [ip, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(ip);
    }
  }
}

/**
 * Resetuje store — przydatne w testach.
 */
export function resetRateLimitStore(): void {
  store.clear();
}

/**
 * Zwraca aktualny rozmiar store — przydatne w testach.
 */
export function getRateLimitStoreSize(): number {
  return store.size;
}
