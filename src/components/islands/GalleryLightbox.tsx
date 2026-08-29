// Directive: client:visible
import { useState, useEffect, useCallback, useRef } from 'react';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import translations from '@/i18n/pl.json';

interface GalleryProject {
  id: string;
  title: string;
  meta: string;
  category: string;
  image?: { src: string; fullSrc: string; alt: string };
  placeholderNote?: string;
}

interface GalleryLightboxProps {
  projects: GalleryProject[];
  categories: string[];
  initialCategory?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  domy: translations.gallery.domy,
  sauny: translations.gallery.sauny,
  tarasy: translations.gallery.tarasy,
  zadaszenia: translations.gallery.zadaszenia,
  wnetrza: translations.gallery.wnetrza,
};

export default function GalleryLightbox({ projects, categories, initialCategory = null }: GalleryLightboxProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const shown = activeCategory ? projects.filter((p) => p.category === activeCategory) : projects;
  // Tylko realizacje z prawdziwym zdjęciem można otworzyć w lightboxie i po nich nawigować.
  const openable = shown.filter((p) => p.image);
  const lightboxIndex = lightboxId ? openable.findIndex((p) => p.id === lightboxId) : -1;

  const openLightbox = useCallback((id: string) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setLightboxId(id);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxId(null);
    setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 0);
  }, []);

  const goNext = useCallback(() => {
    if (openable.length === 0) return;
    setLightboxId((prev) => {
      const i = openable.findIndex((p) => p.id === prev);
      return openable[(i + 1) % openable.length]?.id ?? prev;
    });
  }, [openable]);

  const goPrev = useCallback(() => {
    if (openable.length === 0) return;
    setLightboxId((prev) => {
      const i = openable.findIndex((p) => p.id === prev);
      return openable[(i - 1 + openable.length) % openable.length]?.id ?? prev;
    });
  }, [openable]);

  useEffect(() => {
    if (lightboxId === null) return;

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
  }, [lightboxId, closeLightbox, goNext, goPrev]);

  useEffect(() => {
    if (lightboxId === null) return;

    lightboxRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxId]);

  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || lightboxId === null) return;

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
  }, [lightboxId]);

  useEffect(() => {
    setLightboxId(null);
  }, [activeCategory]);

  const current = lightboxIndex >= 0 ? openable[lightboxIndex] : null;

  return (
    <div>
      {/* Filtry kategorii */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtruj realizacje po kategorii">
        <button
          onClick={() => setActiveCategory(null)}
          aria-label="Pokaż wszystkie realizacje"
          aria-pressed={activeCategory === null}
          className={`rounded-[3px] border px-[18px] py-[9px] font-sans text-[13px] transition-colors ${
            activeCategory === null
              ? 'border-primary bg-accent-soft text-primary-dark'
              : 'border-text/18 text-text-secondary hover:border-primary'
          }`}
        >
          {translations.gallery.all}
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            aria-label={`Filtruj: ${CATEGORY_LABELS[category] || category}`}
            aria-pressed={activeCategory === category}
            className={`rounded-[3px] border px-[18px] py-[9px] font-sans text-[13px] transition-colors ${
              activeCategory === category
                ? 'border-primary bg-accent-soft text-primary-dark'
                : 'border-text/18 text-text-secondary hover:border-primary'
            }`}
          >
            {CATEGORY_LABELS[category] || category}
          </button>
        ))}
        <span className="ml-auto self-center text-[12.5px] tabular-nums text-text-muted">
          {shown.length} z {projects.length} realizacji
        </span>
      </div>

      {/* Siatka realizacji */}
      <div className="mt-8 grid grid-cols-1 gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((project) =>
          project.image ? (
            <button
              key={project.id}
              onClick={() => openLightbox(project.id)}
              className="block cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Otwórz podgląd: ${project.title}`}
            >
              <span className="block border-[6px] border-surface outline outline-1 outline-hairline">
                <img
                  src={project.image.src}
                  alt={project.image.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-[300px] w-full object-cover"
                />
              </span>
              <span className="mt-4 block text-[11px] tracking-[0.16em] text-primary-dark uppercase">{project.meta}</span>
              <span className="mt-2 block font-serif text-[23px] leading-[1.2] text-text">{project.title}</span>
            </button>
          ) : (
            <div key={project.id} aria-hidden="true">
              <div className="flex h-[300px] flex-col items-center justify-center gap-2 border border-hairline bg-[#e2ded6] px-6 text-center">
                <ImageIcon className="h-8 w-8 text-text-muted" strokeWidth={1} aria-hidden="true" />
                <p className="text-[10px] tracking-[0.18em] text-text-muted uppercase">Kadr do uzupełnienia</p>
                <p className="text-[12.5px] text-text-muted">{project.placeholderNote}</p>
              </div>
              <span className="mt-4 block text-[11px] tracking-[0.16em] text-primary-dark uppercase">{project.meta}</span>
              <span className="mt-2 block font-serif text-[23px] leading-[1.2] text-text">{project.title}</span>
            </div>
          )
        )}
      </div>

      {/* Empty state */}
      {shown.length === 0 && (
        <p className="py-12 text-center text-text-muted">{translations.gallery.noResults}</p>
      )}

      {/* Lightbox overlay */}
      {current && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Podgląd zdjęcia: ${current.title}`}
          tabIndex={0}
          onKeyDown={handleFocusTrap}
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark/95 p-4"
        >
          <div aria-hidden="true" className="absolute inset-0" onClick={closeLightbox} />

          <button
            onClick={closeLightbox}
            aria-label="Zamknij podgląd"
            className="absolute top-4 right-4 z-10 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 hover:text-dark-accent"
          >
            <X className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
          </button>

          {openable.length > 1 && (
            <button
              onClick={goPrev}
              aria-label="Poprzednie zdjęcie"
              className="absolute left-4 z-10 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 hover:text-dark-accent"
            >
              <ChevronLeft className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}

          <div className="relative z-10 flex max-h-[90vh] max-w-5xl flex-col items-center">
            <img
              src={current.image!.fullSrc}
              alt={current.image!.alt}
              className="max-h-[80vh] max-w-full rounded-sm object-contain shadow-2xl"
            />
            <p className="mt-4 text-center text-lg font-medium text-white">{current.title}</p>
            <p className="mt-1 text-sm text-white/60">
              {lightboxIndex + 1} / {openable.length}
            </p>
          </div>

          {openable.length > 1 && (
            <button
              onClick={goNext}
              aria-label="Następne zdjęcie"
              className="absolute right-4 z-10 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 hover:text-dark-accent"
            >
              <ChevronRight className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
