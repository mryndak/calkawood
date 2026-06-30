import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  type AllowedExtension,
  type AllowedMimeType,
} from './upload-constants';

// Re-export współdzielonych stałych/typów dla zgodności z istniejącymi importami
export {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  type AllowedExtension,
  type AllowedMimeType,
};

// --- Types ---

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// --- File Validation ---

/**
 * Validates a file against allowed extensions, MIME types, and size limit.
 */
export function validateFile(file: File): ValidationResult {
  // Check extension
  const nameParts = file.name.split('.');
  const extension = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : '';

  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      valid: false,
      error: `Niedozwolone rozszerzenie pliku: .${extension}. Dozwolone: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: `Niedozwolony typ pliku: ${file.type}. Dozwolone typy: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Plik jest za duży (${sizeMB} MB). Maksymalny rozmiar to 10 MB.`,
    };
  }

  return { valid: true };
}

// --- File Name Sanitization ---

/**
 * Sanitizes a file name by removing path components, null bytes,
 * and special characters. Returns a safe filename for disk storage.
 */
export function sanitizeFileName(name: string): string {
  // Remove null bytes
  let sanitized = name.replace(/\0/g, '');

  // Remove path separators — get only the basename
  sanitized = sanitized.replace(/^.*[/\\]/, '');

  // Split into name and extension
  const lastDotIndex = sanitized.lastIndexOf('.');
  let baseName: string;
  let extension: string;

  if (lastDotIndex > 0) {
    baseName = sanitized.slice(0, lastDotIndex);
    extension = sanitized.slice(lastDotIndex + 1).toLowerCase();
  } else {
    baseName = sanitized;
    extension = '';
  }

  // Keep only alphanumeric, hyphens, and underscores in the base name
  baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '');

  // Keep only alphanumeric in the extension
  extension = extension.replace(/[^a-zA-Z0-9]/g, '');

  // Ensure base name is non-empty
  if (!baseName) {
    baseName = 'file';
  }

  // Preserve extension only if it's in the allowed list
  if (extension && ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return `${baseName}.${extension}`;
  }

  // If no valid extension, return just the base name
  return baseName;
}

// --- File Save ---

/**
 * Saves an uploaded file to the runtime upload directory.
 * Returns the relative path to the saved file.
 */
export async function saveUploadedFile(file: File, quoteId: number): Promise<string> {
  const uploadDir = import.meta.env.UPLOAD_DIR || join(process.cwd(), '..', 'uploads');
  const quoteDir = join(uploadDir, 'quotes', String(quoteId));

  // Create directory if it doesn't exist
  await mkdir(quoteDir, { recursive: true });

  // Determine file index based on existing files in directory
  let existingFiles: string[] = [];
  try {
    existingFiles = await readdir(quoteDir);
  } catch {
    // Directory just created, no files yet
  }
  const index = existingFiles.length + 1;

  // Generate safe filename
  const sanitizedName = sanitizeFileName(file.name);
  const fileName = `${index}-${sanitizedName}`;
  const filePath = join(quoteDir, fileName);

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Return relative path from upload root
  return `quotes/${quoteId}/${fileName}`;
}
