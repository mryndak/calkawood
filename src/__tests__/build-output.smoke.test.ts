/**
 * Smoke test: Verify pages without interactive islands don't load page-specific JS.
 *
 * In Astro's Islands Architecture, pages that only use Astro components should
 * not inject page-specific client JS bundles (QuoteForm, GalleryLightbox).
 *
 * Note: All pages share the MobileMenu island (client:idle) from Navigation.
 * This is acceptable — it's deferred and shared across all pages.
 * The key requirement is that pages without their own islands don't pull in
 * heavy page-specific JS (QuoteForm, GalleryLightbox).
 *
 * Validates: Requirements 12.5, 12.6
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST_DIR = resolve(__dirname, '../../dist');
const SERVER_CHUNKS_DIR = join(DIST_DIR, 'server/chunks');

// Pages that should NOT have page-specific islands (only shared MobileMenu)
const STATIC_PAGE_CHUNKS = [
  'o-mnie',
  'kontakt',
  'polityka-prywatnosci',
  'regulamin',
  'stolarka-na-wymiar',
  'tarasy',
  'podlogi-i-wnetrza',
  'budowa-szkieletowa',
];

// Page-specific island JS that should NOT appear in static pages
const PAGE_SPECIFIC_ISLANDS = ['QuoteForm', 'GalleryLightbox'];

describe('Build output — zero page-specific JS on static pages', () => {
  it('dist directory should exist (run npm run build first)', () => {
    expect(existsSync(DIST_DIR)).toBe(true);
  });

  it('server chunks directory should exist', () => {
    expect(existsSync(SERVER_CHUNKS_DIR)).toBe(true);
  });

  it('client _astro directory should contain shared assets', () => {
    const clientAstroDir = join(DIST_DIR, 'client/_astro');
    if (!existsSync(clientAstroDir)) {
      // If build hasn't run, skip gracefully
      return;
    }
    const files = readdirSync(clientAstroDir);
    // Should have MobileMenu bundle (shared island)
    const hasMobileMenu = files.some((f) => f.includes('MobileMenu'));
    expect(hasMobileMenu).toBe(true);
  });

  // Verify that static page server chunks don't directly import page-specific islands
  for (const pageSlug of STATIC_PAGE_CHUNKS) {
    it(`${pageSlug} page chunk should not reference QuoteForm or GalleryLightbox`, () => {
      if (!existsSync(SERVER_CHUNKS_DIR)) return;

      const chunkFiles = readdirSync(SERVER_CHUNKS_DIR);
      const pageChunk = chunkFiles.find((f) => f.startsWith(pageSlug));

      if (!pageChunk) {
        // Chunk might not exist if build hasn't run — skip gracefully
        return;
      }

      const chunkContent = readFileSync(
        join(SERVER_CHUNKS_DIR, pageChunk),
        'utf-8'
      );

      for (const island of PAGE_SPECIFIC_ISLANDS) {
        expect(
          chunkContent,
          `Page "${pageSlug}" should not reference ${island} island`
        ).not.toContain(island);
      }
    });
  }

  it('hydration directives should use client:visible or client:idle (not client:load)', () => {
    // Verify by checking that no source files use client:load
    const srcDir = resolve(__dirname, '../');
    const astroFiles = findFiles(srcDir, '.astro');

    for (const file of astroFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(
        content,
        `File "${file}" should not use client:load directive`
      ).not.toContain('client:load');
    }
  });
});

/** Recursively find files with given extension */
function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}
