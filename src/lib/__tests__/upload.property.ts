// Feature: calkawood-website, Property 2: File upload validation composite
// **Validates: Requirements 6.1, 6.2, 6.3, 14.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateFile,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/upload';

// --- Generators ---

const validExtensionArbitrary = () => fc.constantFrom(...ALLOWED_EXTENSIONS);

const validMimeTypeArbitrary = () => fc.constantFrom(...ALLOWED_MIME_TYPES);

const invalidExtensionArbitrary = () =>
  fc
    .string({ minLength: 1, maxLength: 10 })
    .filter((ext) => !ALLOWED_EXTENSIONS.includes(ext as never));

const invalidMimeTypeArbitrary = () =>
  fc.oneof(
    fc.constant('application/pdf'),
    fc.constant('text/html'),
    fc.constant('application/javascript'),
    fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })).map(([a, b]) => `${a}/${b}`),
  ).filter((mime) => !ALLOWED_MIME_TYPES.includes(mime as never));

const validFileSizeArbitrary = () => fc.integer({ min: 1, max: MAX_FILE_SIZE });

const oversizedFileSizeArbitrary = () =>
  fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 3 });

const baseNameArbitrary = () => fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/[.\\/]/g, 'x') || 'file');

// --- Helper to create File objects ---

function createFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// --- Property Tests ---

describe('Property 2: File upload validation composite', () => {
  it('accepts files with valid extension, valid MIME type, and size <= 10MB', () => {
    fc.assert(
      fc.property(
        baseNameArbitrary(),
        validExtensionArbitrary(),
        validMimeTypeArbitrary(),
        validFileSizeArbitrary(),
        (baseName, ext, mime, size) => {
          const fileName = `${baseName}.${ext}`;
          const file = createFile(fileName, mime, size);
          const result = validateFile(file);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects files with invalid extension', () => {
    fc.assert(
      fc.property(
        baseNameArbitrary(),
        invalidExtensionArbitrary(),
        validMimeTypeArbitrary(),
        validFileSizeArbitrary(),
        (baseName, ext, mime, size) => {
          const fileName = `${baseName}.${ext}`;
          const file = createFile(fileName, mime, size);
          const result = validateFile(file);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('rozszerzenie');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects files with invalid MIME type', () => {
    fc.assert(
      fc.property(
        baseNameArbitrary(),
        validExtensionArbitrary(),
        invalidMimeTypeArbitrary(),
        validFileSizeArbitrary(),
        (baseName, ext, mime, size) => {
          const fileName = `${baseName}.${ext}`;
          const file = createFile(fileName, mime, size);
          const result = validateFile(file);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('typ pliku');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects files exceeding 10MB size limit', () => {
    fc.assert(
      fc.property(
        baseNameArbitrary(),
        validExtensionArbitrary(),
        validMimeTypeArbitrary(),
        oversizedFileSizeArbitrary(),
        (baseName, ext, mime, size) => {
          const fileName = `${baseName}.${ext}`;
          const file = createFile(fileName, mime, size);
          const result = validateFile(file);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('za duży');
        },
      ),
      { numRuns: 100 },
    );
  });
});
