// src/lib/security.ts
// Security module: CSP headers and honeypot detection

export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' https://analytics.calkawood.pl; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none';",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  };
}

export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  return typeof body.website === 'string' && body.website.length > 0;
}
