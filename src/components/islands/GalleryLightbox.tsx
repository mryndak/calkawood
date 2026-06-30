// Directive: client:visible
import { useState, useEffect, useCallback, useRef } from 'react';

interface GalleryImage {
  src: string;
  alt: string;
  caption: string;
  category: string;
}

interface GalleryLightboxProps {
  images: GalleryImage[];
  categories: string[];
}

/** Map category slugs to human-readable labels */
const CATEGORY_LABELS: Record<string, string> = {
  'stolarka-na-wymiar': 'Stolarka na wymiar',
  'tarasy': 'Tarasy',
  'podlogi-i-wnetrza': 'Podłogi i wnętrza',
  'budowa-szkieletowa': 'Budowa szkieletowa',
};

export default function GalleryLightbox({ images, categories }: GalleryLightboxProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Filtered images based on active category
  const filteredImages = activeCategory
    ? images.filter((img) => img.category === activeCategory)
    : images;

  // Lightbox navigation within filtered set
  const openLightbox = useCallback((index: number) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    // Restore focus to previously focused element
    setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 0);
  }, []);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % filteredImages.length : null
    );
  }, [lightboxIndex, filteredImages.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + filteredImages.length) % filteredImages.length : null
    );
  }, [lightboxIndex, filteredImages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  // Focus trap in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    // Focus the lightbox container
    lightboxRef.current?.focus();

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex]);

  // Focus trap handler
  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || lightboxIndex === null) return;

    const focusableElements = lightboxRef.current?.querySelectorAll<HTMLElement>(
      'button, [tabindex="0"]'
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [lightboxIndex]);

  // Reset lightbox index when category changes (filtered set changes)
  useEffect(() => {
    setLightboxIndex(null);
  }, [activeCategory]);

  return (
    <div>
      {/* Category filter buttons */}
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filtruj realizacje po kategorii">
        <button
          onClick={() => setActiveCategory(null)}
          aria-label="Pokaż wszystkie realizacje"
          aria-pressed={activeCategory === null}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeCategory === null
              ? 'bg-cta text-white'
              : 'bg-white border border-gray-300 text-text hover:border-primary'
          }`}
        >
          Wszystkie
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            aria-label={`Filtruj: ${CATEGORY_LABELS[category] || category}`}
            aria-pressed={activeCategory === category}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-cta text-white border-2 border-primary'
                : 'bg-white border border-gray-300 text-text hover:border-primary'
            }`}
          >
            {CATEGORY_LABELS[category] || category}
          </button>
        ))}
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredImages.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            onClick={() => openLightbox(index)}
            className="group relative overflow-hidden rounded-lg aspect-[4/3] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Otwórz podgląd: ${image.alt}`}
          >
            {/* TODO: Replace with <Image /> from astro:assets once real image files are available in src/assets/ */}
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <p className="absolute bottom-0 left-0 right-0 p-3 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {image.caption}
            </p>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredImages.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          Brak realizacji w wybranej kategorii.
        </p>
      )}

      {/* Lightbox overlay */}
      {lightboxIndex !== null && filteredImages[lightboxIndex] && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Podgląd zdjęcia: ${filteredImages[lightboxIndex].alt}`}
          tabIndex={0}
          onKeyDown={handleFocusTrap}
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/95 p-4"
        >
          {/* Background overlay (for click-to-close) */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            onClick={closeLightbox}
          />

          {/* Close button */}
          <button
            onClick={closeLightbox}
            aria-label="Zamknij podgląd"
            className="absolute top-4 right-4 z-10 p-2 text-white hover:text-cta transition-colors rounded-full bg-black/30 hover:bg-black/50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {filteredImages.length > 1 && (
            <button
              onClick={goPrev}
              aria-label="Poprzednie zdjęcie"
              className="absolute left-4 z-10 p-2 text-white hover:text-cta transition-colors rounded-full bg-black/30 hover:bg-black/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image and caption */}
          <div className="relative z-10 max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img
              src={filteredImages[lightboxIndex].src}
              alt={filteredImages[lightboxIndex].alt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="mt-4 text-white text-center text-lg font-medium">
              {filteredImages[lightboxIndex].caption}
            </p>
            <p className="mt-1 text-white/60 text-sm">
              {lightboxIndex + 1} / {filteredImages.length}
            </p>
          </div>

          {/* Next button */}
          {filteredImages.length > 1 && (
            <button
              onClick={goNext}
              aria-label="Następne zdjęcie"
              className="absolute right-4 z-10 p-2 text-white hover:text-cta transition-colors rounded-full bg-black/30 hover:bg-black/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
