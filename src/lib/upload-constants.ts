// Współdzielone stałe i typy uploadu — bezpieczne do importu po stronie klienta.
// Nie zawiera zależności Node (fs/path), więc wyspy React mogą importować bez
// wciągania kodu serwerowego do bundla przeglądarki.

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES = 5;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
