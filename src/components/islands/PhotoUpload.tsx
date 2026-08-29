// PhotoUpload — React island sub-component for QuoteForm step 3
// Validates: Requirements 6.1, 6.2, 6.4, 6.5, 6.6

import { useState, useCallback, useRef, useEffect } from 'react';
import { ALLOWED_EXTENSIONS } from '@/lib/upload-constants';

// --- Types ---

interface PhotoUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles: number;
  maxFileSize: number; // bytes
}

interface FilePreview {
  file: File;
  url: string;
}

interface UploadError {
  fileName: string;
  message: string;
}

// --- Constants ---

const ALLOWED_EXTENSIONS_SET = new Set(ALLOWED_EXTENSIONS);
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

// --- Helpers ---

function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compresses an image using canvas resize.
 * If any dimension exceeds MAX_DIMENSION, resizes proportionally.
 * Outputs JPEG at JPEG_QUALITY.
 */
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    // HEIC files cannot be rendered in canvas — skip compression
    const ext = getFileExtension(file.name);
    if (ext === 'heic') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only resize if dimensions exceed max
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        resolve(file);
        return;
      }

      // Scale proportionally
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Preserve original name but change extension to .jpg
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If image can't load, return original file
      resolve(file);
    };

    img.src = url;
  });
}

function validateFileClient(
  file: File,
  currentCount: number,
  maxFiles: number,
  maxFileSize: number,
): string | null {
  // Check total count
  if (currentCount >= maxFiles) {
    return `Można przesłać maksymalnie ${maxFiles} plików.`;
  }

  // Check extension
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS_SET.has(ext as typeof ALLOWED_EXTENSIONS[number])) {
    return `Niedozwolony typ pliku: .${ext}. Dozwolone: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }

  // Check size
  if (file.size > maxFileSize) {
    return `Plik "${file.name}" jest za duży (${formatFileSize(file.size)}). Maks. ${formatFileSize(maxFileSize)}.`;
  }

  return null;
}

// --- Component ---

export default function PhotoUpload({
  files,
  onFilesChange,
  maxFiles,
  maxFileSize,
}: PhotoUploadProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync previews with files prop
  useEffect(() => {
    // Revoke old URLs
    previews.forEach((p) => URL.revokeObjectURL(p.url));

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(newPreviews);

    // Cleanup on unmount
    return () => {
      newPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const processFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const fileArray = Array.from(incoming);
      const newErrors: UploadError[] = [];
      const validFiles: File[] = [];

      let currentCount = files.length;

      for (const file of fileArray) {
        const error = validateFileClient(file, currentCount, maxFiles, maxFileSize);
        if (error) {
          newErrors.push({ fileName: file.name, message: error });
          continue;
        }
        validFiles.push(file);
        currentCount++;
      }

      setErrors(newErrors);

      if (validFiles.length === 0) return;

      setIsProcessing(true);

      // Compress valid files
      const compressed: File[] = [];
      for (const file of validFiles) {
        try {
          const result = await compressImage(file);
          compressed.push(result);
        } catch {
          // If compression fails, use original
          compressed.push(file);
        }
      }

      setIsProcessing(false);

      const updatedFiles = [...files, ...compressed];
      onFilesChange(updatedFiles);
      setStatusMessage(
        `Dodano ${compressed.length} plik(ów). Łącznie: ${updatedFiles.length}/${maxFiles}.`,
      );
    },
    [files, maxFiles, maxFileSize, onFilesChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [processFiles],
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemove = useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index);
      onFilesChange(updatedFiles);
      setStatusMessage(
        `Usunięto plik. Łącznie: ${updatedFiles.length}/${maxFiles}.`,
      );
      setErrors([]);
    },
    [files, maxFiles, onFilesChange],
  );

  const acceptString = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="region"
        aria-label="Obszar przesyłania zdjęć"
        aria-describedby="upload-instructions"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer
          ${isDragOver
            ? 'border-cta bg-cta/5'
            : 'border-primary/40 bg-background hover:border-primary'
          }
          ${files.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}
        `}
        onClick={handleBrowseClick}
      >
        {/* Upload icon */}
        <svg
          className="h-10 w-10 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>

        <p className="text-center text-sm text-text/70">
          <span className="font-medium text-text">Przeciągnij i upuść zdjęcia tutaj</span>
          <br />
          <span>lub</span>
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseClick();
          }}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-hover focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
          disabled={files.length >= maxFiles}
        >
          Wybierz pliki
        </button>

        <p id="upload-instructions" className="text-center text-xs text-text/50">
          Maks. {maxFiles} plików · Maks. {formatFileSize(maxFileSize)} / plik · JPG, PNG, WebP, HEIC
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          multiple
          onChange={handleFileInput}
          className="sr-only"
          aria-label="Wybierz pliki do przesłania"
          tabIndex={-1}
        />
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <p className="text-sm text-text/70 animate-pulse" aria-live="polite">
          Przetwarzanie zdjęć...
        </p>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <ul className="space-y-1" role="alert" aria-label="Błędy przesyłania">
          {errors.map((err, i) => (
            <li key={i} className="text-sm text-red-600">
              {err.message}
            </li>
          ))}
        </ul>
      )}

      {/* Thumbnail grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {previews.map((preview, index) => (
            <div
              key={`${preview.file.name}-${index}`}
              className="group relative overflow-hidden rounded-lg border border-primary/20 bg-white"
            >
              <img
                src={preview.url}
                alt={`Podgląd: ${preview.file.name}`}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <span className="w-full truncate px-2 py-1 text-xs text-white">
                  {preview.file.name}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-2 py-1 text-xs text-text/60">
                {formatFileSize(preview.file.size)}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 focus:opacity-100 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label={`Usuń plik: ${preview.file.name}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Status message for screen readers */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      {/* File count indicator */}
      {files.length > 0 && (
        <p className="text-sm text-text/60">
          {files.length} z {maxFiles} plików wybranych
        </p>
      )}
    </div>
  );
}
