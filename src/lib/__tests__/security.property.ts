// Feature: calkawood-website, Property 5: Honeypot silent discard
// **Validates: Requirements 7.8**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isHoneypotFilled } from '@/lib/security';

describe('Property 5: Honeypot silent discard', () => {
  it('returns true for any non-empty string in website field', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (website) => {
          const body = { website };
          expect(isHoneypotFilled(body)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false for empty string in website field', () => {
    fc.assert(
      fc.property(
        fc.constant(''),
        (website) => {
          const body = { website };
          expect(isHoneypotFilled(body)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false when website field is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string(),
          email: fc.string(),
        }),
        (body) => {
          expect(isHoneypotFilled(body)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false for non-string values in website field', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.string()),
          fc.dictionary(fc.string(), fc.string())
        ),
        (website) => {
          const body = { website } as Record<string, unknown>;
          expect(isHoneypotFilled(body)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
