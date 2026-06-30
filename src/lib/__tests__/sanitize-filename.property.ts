// Feature: calkawood-website, Property 3: File name sanitization safety
// **Validates: Requirements 6.7**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sanitizeFileName, ALLOWED_EXTENSIONS } from '@/lib/upload';

/**
 * Generator: potentially malicious file names including path traversal,
 * null bytes, Windows paths, unicode, and XSS attempts.
 */
const maliciousFileNameArbitrary = () =>
  fc.oneof(
    fc.string({ minLength: 1 }).map(s => `../../${s}.jpg`),           // path traversal
    fc.string({ minLength: 1 }).map(s => `${s}\x00.jpg`),            // null byte
    fc.string({ minLength: 1 }).map(s => `C:\\Windows\\${s}.jpg`),    // Windows path
    fc.string({ minLength: 1, unit: 'grapheme' }).map(s => `${s}.png`), // unicode
    fc.string({ minLength: 1 }).map(s => `${s}<script>.jpg`),        // XSS attempt
  );

describe('Property 3: File name sanitization safety', () => {
  it('sanitized output contains no path separators (/ or \\)', () => {
    fc.assert(
      fc.property(maliciousFileNameArbitrary(), (input) => {
        const result = sanitizeFileName(input);
        expect(result).not.toMatch(/[/\\]/);
      }),
      { numRuns: 100 }
    );
  });

  it('sanitized output contains no null bytes', () => {
    fc.assert(
      fc.property(maliciousFileNameArbitrary(), (input) => {
        const result = sanitizeFileName(input);
        expect(result).not.toContain('\x00');
      }),
      { numRuns: 100 }
    );
  });

  it('sanitized output contains only alphanumeric, hyphens, underscores, and a single dot before extension', () => {
    fc.assert(
      fc.property(maliciousFileNameArbitrary(), (input) => {
        const result = sanitizeFileName(input);
        // Valid patterns:
        // - "baseName" (no extension): only [a-zA-Z0-9_-]+
        // - "baseName.ext" (with extension): [a-zA-Z0-9_-]+\.[a-zA-Z0-9]+
        expect(result).toMatch(/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/);
      }),
      { numRuns: 100 }
    );
  });

  it('sanitized output is non-empty', () => {
    fc.assert(
      fc.property(maliciousFileNameArbitrary(), (input) => {
        const result = sanitizeFileName(input);
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('preserves the original file extension if it was allowed', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).chain((base) =>
          fc.constantFrom(...ALLOWED_EXTENSIONS).map((ext) => ({
            input: `${base}.${ext}`,
            expectedExt: ext,
          }))
        ),
        ({ input, expectedExt }) => {
          const result = sanitizeFileName(input);
          // If the result has an extension, it must match the expected allowed extension
          if (result.includes('.')) {
            const resultExt = result.split('.').pop()!;
            expect(resultExt).toBe(expectedExt);
          }
          // Result is still valid (non-empty, safe characters)
          expect(result.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles arbitrary strings safely (never crashes, always returns valid output)', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        // Should never throw, even for empty strings or pure garbage
        const result = sanitizeFileName(input);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toMatch(/[/\\]/);
        expect(result).not.toContain('\x00');
        expect(result).toMatch(/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/);
      }),
      { numRuns: 100 }
    );
  });
});
