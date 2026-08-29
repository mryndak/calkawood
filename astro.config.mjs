// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://calkawood.pl',

  output: 'server',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: node({
    mode: 'standalone',
  }),

  security: {
    checkOrigin: false,
  },

  // Na razie tylko polski — angielski jest planowany (patrz src/i18n/index.ts).
  // routing.prefixDefaultLocale: false utrzymuje polskie adresy bez przedrostka
  // (/, /kontakt, ...), żeby dodanie /en/... w przyszłości nie zmieniało
  // istniejących URL-i.
  i18n: {
    defaultLocale: 'pl',
    locales: ['pl'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});