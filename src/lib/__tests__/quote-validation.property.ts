// Feature: calkawood-website, Property 6: Quote schema validation (accept valid, reject invalid)
// **Validates: Requirements 8.1**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { z } from 'zod';
import { quoteRequestSchema, SERVICE_CATEGORIES } from '@/lib/quote-validation';
import { MATERIALS, TERMS, MIN_AREA, MAX_AREA } from '@/lib/estimate';

const zodEmailValidator = z.string().email();

/** Generates a valid Polish phone number matching /^\+?48?\s?\d{3}\s?\d{3}\s?\d{3}$/ */
const polishPhoneArbitrary = () =>
  fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 9, maxLength: 9 })
    .map(digits => `+48${digits.join('')}`);

/** Generates a valid quote request that should always pass Zod validation */
const validQuoteRequestArbitrary = () =>
  fc.record({
    usluga: fc.constantFrom(...SERVICE_CATEGORIES),
    powierzchnia: fc.integer({ min: MIN_AREA, max: MAX_AREA }),
    material: fc.constantFrom(...MATERIALS),
    termin: fc.constantFrom(...TERMS),
    telefon: polishPhoneArbitrary(),
    imie: fc.string({ minLength: 2, maxLength: 100 }),
    email: fc.emailAddress().filter(e => zodEmailValidator.safeParse(e).success),
    zgoda_rodo: fc.constant(true as const),
    opis: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  });

describe('Property 6: Quote schema validation (accept valid, reject invalid)', () => {
  it('accepts any valid QuoteRequest object', () => {
    fc.assert(
      fc.property(validQuoteRequestArbitrary(), (request) => {
        const result = quoteRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects when usluga is not one of the valid categories', () => {
    fc.assert(
      fc.property(
        validQuoteRequestArbitrary(),
        fc.string({ minLength: 1 }).filter(s => !(SERVICE_CATEGORIES as readonly string[]).includes(s)),
        (request, invalidCategory) => {
          const invalid = { ...request, usluga: invalidCategory };
          const result = quoteRequestSchema.safeParse(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            const fields = result.error.flatten().fieldErrors;
            expect(fields.usluga).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when powierzchnia is outside the 10–250 m² range', () => {
    fc.assert(
      fc.property(
        validQuoteRequestArbitrary(),
        fc.integer({ min: -1000, max: 1000 }).filter((n) => n < MIN_AREA || n > MAX_AREA),
        (request, invalidArea) => {
          const invalid = { ...request, powierzchnia: invalidArea };
          const result = quoteRequestSchema.safeParse(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            const fields = result.error.flatten().fieldErrors;
            expect(fields.powierzchnia).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when telefon has invalid format', () => {
    fc.assert(
      fc.property(
        validQuoteRequestArbitrary(),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/^\+?48?\s?\d{3}\s?\d{3}\s?\d{3}$/.test(s)),
        (request, invalidPhone) => {
          const invalid = { ...request, telefon: invalidPhone };
          const result = quoteRequestSchema.safeParse(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            const fields = result.error.flatten().fieldErrors;
            expect(fields.telefon).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when zgoda_rodo is false', () => {
    fc.assert(
      fc.property(validQuoteRequestArbitrary(), (request) => {
        const invalid = { ...request, zgoda_rodo: false };
        const result = quoteRequestSchema.safeParse(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const fields = result.error.flatten().fieldErrors;
          expect(fields.zgoda_rodo).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: calkawood-website, Property 7: Quote data serialization round-trip
// **Validates: Requirements 8.4**

describe('Property 7: Quote data serialization round-trip', () => {
  it('parse → serialize → parse produces equivalent object', () => {
    fc.assert(
      fc.property(validQuoteRequestArbitrary(), (quoteRequest) => {
        const serialized = JSON.stringify(quoteRequest);
        const deserialized = JSON.parse(serialized);
        const reparsed = quoteRequestSchema.parse(deserialized);
        expect(reparsed).toEqual(quoteRequest);
      }),
      { numRuns: 100 }
    );
  });
});
