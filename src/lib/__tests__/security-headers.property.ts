// Feature: calkawood-website, Property 9: Security headers present on all responses
// **Validates: Requirements 14.2**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getSecurityHeaders } from '@/lib/security';

describe('Property 9: Security headers present on all responses', () => {
  const REQUIRED_HEADERS = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'X-Frame-Options',
    'Strict-Transport-Security',
  ] as const;

  it('always returns all 5 required security headers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        () => {
          const headers = getSecurityHeaders();
          for (const header of REQUIRED_HEADERS) {
            expect(headers).toHaveProperty(header);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('X-Content-Type-Options always equals "nosniff"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        () => {
          const headers = getSecurityHeaders();
          expect(headers['X-Content-Type-Options']).toBe('nosniff');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('X-Frame-Options always equals "DENY"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        () => {
          const headers = getSecurityHeaders();
          expect(headers['X-Frame-Options']).toBe('DENY');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Strict-Transport-Security contains "max-age="', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        () => {
          const headers = getSecurityHeaders();
          expect(headers['Strict-Transport-Security']).toContain('max-age=');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Content-Security-Policy is non-empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        () => {
          const headers = getSecurityHeaders();
          expect(headers['Content-Security-Policy']).toBeTruthy();
          expect(headers['Content-Security-Policy'].length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Referrer-Policy is non-empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        () => {
          const headers = getSecurityHeaders();
          expect(headers['Referrer-Policy']).toBeTruthy();
          expect(headers['Referrer-Policy'].length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
