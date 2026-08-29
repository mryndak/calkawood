// Feature: calkawood-website, Property 10: Phone CTA accessible on every public page
// **Validates: Requirements 1.1, 18.3**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Public page routes and their corresponding source files.
 * Every public page MUST use PageLayout, which includes Navigation.astro
 * (with tel: CTA) and Footer.astro (with tel: CTA).
 */
const PUBLIC_PAGES = [
  { route: '/', file: 'src/pages/index.astro' },
  { route: '/realizacje', file: 'src/pages/realizacje.astro' },
  { route: '/wycena', file: 'src/pages/wycena.astro' },
  { route: '/o-mnie', file: 'src/pages/o-mnie.astro' },
  { route: '/kontakt', file: 'src/pages/kontakt.astro' },
  { route: '/polityka-prywatnosci', file: 'src/pages/polityka-prywatnosci.astro' },
  { route: '/regulamin', file: 'src/pages/regulamin.astro' },
] as const;

const PROJECT_ROOT = resolve(__dirname, '../../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(PROJECT_ROOT, relativePath), 'utf-8');
}

/**
 * Checks if an Astro source file contains a tel: phone link.
 * Handles both static href="tel:..." and Astro template expressions like href={`tel:...`}
 * or href={VARIABLE} where the variable is defined with 'tel:' value in frontmatter.
 */
function containsTelLink(source: string): boolean {
  // Direct href="tel:..." or href='tel:...'
  if (/href=["']tel:[^"']+["']/.test(source)) return true;
  // Astro template expression referencing a variable containing 'tel:'
  if (source.includes('tel:') && /href=\{/.test(source)) return true;
  // Template literal with tel:
  if (/href=\{`tel:/.test(source)) return true;
  return false;
}

describe('Property 10: Phone CTA accessible on every public page', () => {
  // Verify Navigation.astro contains tel: link (via PHONE_HREF variable)
  it('Navigation.astro contains a tel: phone link', () => {
    const navSource = readSource('src/components/ui/Navigation.astro');
    expect(containsTelLink(navSource)).toBe(true);
  });

  // Verify Footer.astro contains tel: link
  it('Footer.astro contains a tel: phone link', () => {
    const footerSource = readSource('src/components/ui/Footer.astro');
    expect(containsTelLink(footerSource)).toBe(true);
  });

  // Property: For any public route, the page source imports a layout that includes Navigation + Footer
  it('every public page uses PageLayout (which includes phone CTA components)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PUBLIC_PAGES),
        (page) => {
          const source = readSource(page.file);
          expect(source.includes('PageLayout')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: PageLayout imports both Navigation and Footer
  it('PageLayout.astro imports Navigation and Footer components', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Navigation', 'Footer'),
        (componentName) => {
          const layoutSource = readSource('src/layouts/PageLayout.astro');
          expect(layoutSource).toContain(componentName);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: For any public page, the full component chain guarantees at least one tel: link
  it('component chain from any public page guarantees phone CTA presence', () => {
    const navSource = readSource('src/components/ui/Navigation.astro');
    const footerSource = readSource('src/components/ui/Footer.astro');

    const navHasTel = containsTelLink(navSource);
    const footerHasTel = containsTelLink(footerSource);

    fc.assert(
      fc.property(
        fc.constantFrom(...PUBLIC_PAGES),
        (page) => {
          const source = readSource(page.file);
          const usesLayout = source.includes('PageLayout');

          // If page uses a layout, it inherits Navigation + Footer with tel: links
          if (usesLayout) {
            expect(navHasTel || footerHasTel).toBe(true);
          } else {
            // If page doesn't use layout, it must contain tel: directly
            expect(containsTelLink(source)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
