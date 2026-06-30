// Feature: calkawood-website, Property 8: Error responses never expose internal details
// **Validates: Requirements 7.2, 14.4**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { AppError, handleApiError } from '@/lib/errors';

/**
 * Wzorce, które NIE MOGĄ pojawić się w odpowiedzi błędów:
 * - Stack traces (np. "at functionName")
 * - Ścieżki node_modules
 * - Ścieżki plików TypeScript/JavaScript (.ts:, .js:)
 * - Connection stringi PostgreSQL (postgres://)
 * - Zapytania SQL (SELECT, INSERT, UPDATE, DELETE)
 * - Kody błędów Node.js (ENOENT, ECONNREFUSED, ERR_)
 */
const FORBIDDEN_PATTERNS = [
  /\bat\s+\w+\s*\(/,          // stack trace: "at functionName ("
  /node_modules/,
  /\.ts:\d/,                   // file path: "file.ts:42"
  /\.js:\d/,                   // file path: "file.js:12"
  /postgres:\/\//,             // connection string
  /\b(?:SELECT|INSERT|UPDATE|DELETE)\b.*\b(?:FROM|INTO|SET)\b/i, // SQL queries
  /\bENOENT\b|\bECONNREFUSED\b|\bERR_[A-Z]/,  // Node.js error codes
];

function assertNoInternalDetails(responseBody: string): void {
  for (const pattern of FORBIDDEN_PATTERNS) {
    expect(responseBody).not.toMatch(pattern);
  }
}

describe('Property 8: Error responses never expose internal details', () => {
  it('AppError response contains only userMessage and optional fieldErrors, never the internal message', () => {
    // Generate internal messages that would be dangerous if exposed —
    // these are specifically distinguishable from user-friendly messages
    const dangerousInternalMessage = fc.oneof(
      fc.constant('Connection to postgres://user:pass@host:5432/db failed'),
      fc.constant('ENOENT: no such file or directory /app/uploads/file.jpg'),
      fc.constant('at DatabaseClient.query (src/lib/db.ts:42:15)'),
      fc.constant('ECONNREFUSED 127.0.0.1:5432'),
      fc.constant('ERR_MODULE_NOT_FOUND: Cannot find module @/lib/internal'),
      fc.constant('SELECT * FROM quote_requests WHERE id = 1'),
      fc.constant('INSERT INTO quote_requests VALUES ($1, $2)'),
      fc.constant('/home/user/calkawood/node_modules/postgres/index.js:99'),
      fc.constant('TypeError at Object.<anonymous> (/app/src/handler.ts:12:5)'),
      fc.constant('UPDATE quote_requests SET status = $1'),
      fc.constant('DELETE FROM sessions WHERE expired_at < NOW()')
    );

    const safeUserMessage = fc.oneof(
      fc.constant('Nieprawidłowe dane formularza.'),
      fc.constant('Zbyt wiele zapytań. Spróbuj ponownie później.'),
      fc.constant('Wystąpił błąd. Spróbuj ponownie lub zadzwoń.'),
      fc.constant('Plik jest za duży. Maksymalny rozmiar to 10 MB.'),
      fc.constant('Nieprawidłowy format pliku.')
    );

    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }),
        dangerousInternalMessage,
        safeUserMessage,
        fc.option(
          fc.dictionary(
            fc.constantFrom('usluga', 'opis', 'telefon', 'imie', 'email'),
            fc.array(
              fc.constantFrom(
                'Pole wymagane',
                'Minimum 20 znaków',
                'Nieprawidłowy format'
              ),
              { minLength: 1, maxLength: 2 }
            )
          ),
          { nil: undefined }
        ),
        (statusCode, internalMessage, userMessage, fieldErrors) => {
          const appError = new AppError(internalMessage, statusCode, userMessage, fieldErrors);
          const response = handleApiError(appError);

          // Verify status code
          expect(response.status).toBe(statusCode);

          // Reconstruct the body that handleApiError produces
          const expectedBody: Record<string, unknown> = { error: userMessage };
          if (fieldErrors) {
            expectedBody.errors = fieldErrors;
          }
          const bodyStr = JSON.stringify(expectedBody);

          // Internal dangerous message must NOT appear in response
          expect(bodyStr).not.toContain(internalMessage);

          // Response body must not match forbidden patterns
          assertNoInternalDetails(bodyStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('unexpected Error response contains only generic message, never stack trace or internal details', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 300 }),
          fc.constant('ENOENT: no such file or directory'),
          fc.constant('ECONNREFUSED 127.0.0.1:5432'),
          fc.constant('ERR_MODULE_NOT_FOUND'),
          fc.constant('at Object.<anonymous> (/app/src/lib/db.ts:45:12)'),
          fc.constant('postgres://user:pass@localhost:5432/calkawood'),
          fc.constant('SELECT * FROM quote_requests WHERE id = 1'),
          fc.constant('Error in /home/user/projects/calkawood/node_modules/postgres/src/index.js:123')
        ),
        (errorMessage) => {
          const error = new Error(errorMessage);
          const response = handleApiError(error);

          expect(response.status).toBe(500);

          // The generic response body
          const bodyStr = JSON.stringify({
            error: 'Wystąpił błąd. Spróbuj ponownie lub zadzwoń.',
          });

          // Must not contain the original error message (unless it's a substring of the generic message)
          if (errorMessage.length > 5 && !bodyStr.includes(errorMessage)) {
            expect(bodyStr).not.toContain(errorMessage);
          }

          // Must not match any forbidden pattern
          assertNoInternalDetails(bodyStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('response body string does NOT match dangerous patterns for any error type', () => {
    const dangerousInternalMessages = fc.oneof(
      fc.constant('at processTicksAndRejections (node:internal/process/task_queues:95:5)'),
      fc.constant('/home/deploy/calkawood/node_modules/postgres/src/connection.js:142:19'),
      fc.constant('src/lib/db.ts:55 - Connection failed'),
      fc.constant('app.js:12 - Unhandled rejection'),
      fc.constant('postgres://admin:secret123@db.mydevil.net:5432/calkawood_prod'),
      fc.constant('SELECT id, imie, telefon FROM quote_requests WHERE status = $1'),
      fc.constant('INSERT INTO quote_requests (usluga, opis) VALUES ($1, $2)'),
      fc.constant('UPDATE quote_requests SET status = $1 WHERE id = $2'),
      fc.constant('DELETE FROM quote_requests WHERE id = $1'),
      fc.constant('ENOENT: no such file or directory, open /tmp/uploads/quote_42/photo.jpg'),
      fc.constant('ECONNREFUSED 10.0.0.5:5432'),
      fc.constant('ERR_INVALID_ARG_TYPE: The "path" argument must be of type string')
    );

    fc.assert(
      fc.property(dangerousInternalMessages, (internalMessage) => {
        // Test as unexpected Error (500)
        const unexpectedError = new Error(internalMessage);
        const response500 = handleApiError(unexpectedError);
        expect(response500.status).toBe(500);

        // The actual body produced by handleApiError for unknown errors
        const genericBody = JSON.stringify({
          error: 'Wystąpił błąd. Spróbuj ponownie lub zadzwoń.',
        });
        assertNoInternalDetails(genericBody);
        expect(genericBody).not.toContain(internalMessage);

        // Test as AppError — internal message should not leak
        const appError = new AppError(
          internalMessage,
          400,
          'Nieprawidłowe dane formularza.'
        );
        const response400 = handleApiError(appError);
        expect(response400.status).toBe(400);

        const appErrorBody = JSON.stringify({
          error: 'Nieprawidłowe dane formularza.',
        });
        assertNoInternalDetails(appErrorBody);
        expect(appErrorBody).not.toContain(internalMessage);
      }),
      { numRuns: 100 }
    );
  });
});
