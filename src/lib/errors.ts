/**
 * Moduł obsługi błędów aplikacji.
 *
 * Wzorzec użycia w API routes:
 * - AppError → odpowiedź z odpowiednim statusCode i userMessage
 * - Nieoczekiwany błąd → logowanie server-side + generyczna odpowiedź 500
 *
 * Validates: Requirements 7.2, 7.5, 14.4
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly userMessage: string,
    public readonly fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Obsługuje błędy w API routes.
 * - AppError: zwraca odpowiedź z kodem i komunikatem użytkownika
 * - Nieoczekiwany błąd: loguje szczegóły server-side, zwraca generyczny komunikat 500
 *
 * Nigdy nie ujawnia szczegółów wewnętrznych (stack trace, ścieżki, SQL) w odpowiedzi.
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        error: error.userMessage,
        ...(error.fieldErrors && { errors: error.fieldErrors }),
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Nieoczekiwany błąd — loguj wewnętrznie, zwróć generyczną odpowiedź
  console.error('[API]', error);
  return new Response(
    JSON.stringify({
      error: 'Wystąpił błąd. Spróbuj ponownie lub zadzwoń.',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
