// Feature: calkawood-website, Property 1: Gallery category filter returns only matching projects
// **Validates: Requirements 4.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Valid gallery categories matching the GalleryLightbox component
const VALID_CATEGORIES = [
  'stolarka-na-wymiar',
  'tarasy',
  'podlogi-i-wnetrza',
  'budowa-szkieletowa',
] as const;

type GalleryCategory = (typeof VALID_CATEGORIES)[number];

interface GalleryImage {
  src: string;
  alt: string;
  caption: string;
  category: string;
}

/**
 * Pure filtering logic extracted from GalleryLightbox component.
 * Mirrors: `activeCategory ? images.filter(img => img.category === activeCategory) : images`
 */
function filterGalleryImages(
  images: GalleryImage[],
  activeCategory: GalleryCategory | null
): GalleryImage[] {
  return activeCategory
    ? images.filter((img) => img.category === activeCategory)
    : images;
}

// --- Arbitraries ---

const galleryImageArb: fc.Arbitrary<GalleryImage> = fc.record({
  src: fc.webUrl(),
  alt: fc.string({ minLength: 1, maxLength: 50 }),
  caption: fc.string({ minLength: 1, maxLength: 100 }),
  category: fc.constantFrom(...VALID_CATEGORIES),
});

const imagesArrayArb: fc.Arbitrary<GalleryImage[]> = fc.array(galleryImageArb, {
  minLength: 0,
  maxLength: 30,
});

const categoryFilterArb: fc.Arbitrary<GalleryCategory | null> = fc.oneof(
  fc.constant(null as GalleryCategory | null),
  fc.constantFrom(...VALID_CATEGORIES)
);

// --- Property tests ---

describe('Gallery category filter - property tests', () => {
  it('returns all images when category is null (no filtering)', () => {
    fc.assert(
      fc.property(imagesArrayArb, (images) => {
        const result = filterGalleryImages(images, null);
        expect(result).toEqual(images);
        expect(result.length).toBe(images.length);
      }),
      { numRuns: 100 }
    );
  });

  it('every returned image has the selected category', () => {
    fc.assert(
      fc.property(imagesArrayArb, categoryFilterArb, (images, category) => {
        const result = filterGalleryImages(images, category);

        if (category !== null) {
          for (const img of result) {
            expect(img.category).toBe(category);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('every image with selected category is present in the result', () => {
    fc.assert(
      fc.property(imagesArrayArb, categoryFilterArb, (images, category) => {
        const result = filterGalleryImages(images, category);

        if (category !== null) {
          const expectedImages = images.filter((img) => img.category === category);
          expect(result.length).toBe(expectedImages.length);

          for (const expected of expectedImages) {
            expect(result).toContain(expected);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('filtered set is always a subset of the original set', () => {
    fc.assert(
      fc.property(imagesArrayArb, categoryFilterArb, (images, category) => {
        const result = filterGalleryImages(images, category);

        for (const img of result) {
          expect(images).toContain(img);
        }
        expect(result.length).toBeLessThanOrEqual(images.length);
      }),
      { numRuns: 100 }
    );
  });

  it('filtering preserves the relative order of images', () => {
    fc.assert(
      fc.property(imagesArrayArb, categoryFilterArb, (images, category) => {
        const result = filterGalleryImages(images, category);

        // Verify order: for each pair in result, their indices in original must be ascending
        const originalIndices = result.map((img) => images.indexOf(img));
        for (let i = 1; i < originalIndices.length; i++) {
          expect(originalIndices[i]).toBeGreaterThan(originalIndices[i - 1]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
