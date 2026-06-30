// Feature: calkawood-website, Property 4: Rate limiting correctness
// **Validates: Requirements 7.7**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { checkRateLimit, resetRateLimitStore } from '@/lib/rate-limit';

/**
 * Generates an arbitrary IPv4 address string.
 */
const ipArbitrary = () =>
  fc
    .tuple(
      fc.integer({ min: 1, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    )
    .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

describe('Property 4: Rate limiting correctness', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('first N requests (N ≤ maxRequests) are always allowed', () => {
    fc.assert(
      fc.property(
        ipArbitrary(),
        fc.integer({ min: 1, max: 20 }), // maxRequests
        fc.integer({ min: 1, max: 20 }), // requestCount ≤ maxRequests
        (ip, maxRequests, requestFraction) => {
          resetRateLimitStore();
          const requestCount = Math.min(requestFraction, maxRequests);
          const windowMs = 60_000; // 1 minute window for testing

          for (let i = 0; i < requestCount; i++) {
            const result = checkRateLimit(ip, maxRequests, windowMs);
            expect(result.allowed).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('request N+1 is rejected when N = maxRequests', () => {
    fc.assert(
      fc.property(
        ipArbitrary(),
        fc.integer({ min: 1, max: 20 }), // maxRequests
        (ip, maxRequests) => {
          resetRateLimitStore();
          const windowMs = 60_000;

          // Exhaust all allowed requests
          for (let i = 0; i < maxRequests; i++) {
            const result = checkRateLimit(ip, maxRequests, windowMs);
            expect(result.allowed).toBe(true);
          }

          // Next request must be rejected
          const rejected = checkRateLimit(ip, maxRequests, windowMs);
          expect(rejected.allowed).toBe(false);
          expect(rejected.retryAfter).toBeDefined();
          expect(rejected.retryAfter).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('different IPs have independent counters', () => {
    fc.assert(
      fc.property(
        ipArbitrary(),
        ipArbitrary(),
        fc.integer({ min: 1, max: 10 }), // maxRequests
        (ip1, ip2, maxRequests) => {
          // Skip if same IP generated
          fc.pre(ip1 !== ip2);

          resetRateLimitStore();
          const windowMs = 60_000;

          // Exhaust limit for ip1
          for (let i = 0; i < maxRequests; i++) {
            checkRateLimit(ip1, maxRequests, windowMs);
          }

          // ip1 should be blocked
          const result1 = checkRateLimit(ip1, maxRequests, windowMs);
          expect(result1.allowed).toBe(false);

          // ip2 should still be allowed
          const result2 = checkRateLimit(ip2, maxRequests, windowMs);
          expect(result2.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('after window expiry, counter resets and new requests are allowed', () => {
    fc.assert(
      fc.property(
        ipArbitrary(),
        fc.integer({ min: 1, max: 10 }), // maxRequests
        (ip, maxRequests) => {
          resetRateLimitStore();
          // Use a very small window so it expires immediately
          const windowMs = 1; // 1ms window

          // Exhaust all allowed requests
          for (let i = 0; i < maxRequests; i++) {
            checkRateLimit(ip, maxRequests, windowMs);
          }

          // Wait for window to expire (sleep alternative: use synchronous busy-wait)
          const start = Date.now();
          while (Date.now() - start < 5) {
            // Busy-wait for at least 5ms to ensure window expires
          }

          // After window expiry, request should be allowed again
          const result = checkRateLimit(ip, maxRequests, windowMs);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
