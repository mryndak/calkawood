// src/lib/security.ts
// Security module: CSP headers and honeypot detection

export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://analytics.calkawood.pl https://www.googletagmanager.com https://www.google.com https://www.gstatic.com; img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.google.com; frame-src https://www.google.com; frame-ancestors 'none';",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  };
}

export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  return typeof body.website === 'string' && body.website.length > 0;
}
