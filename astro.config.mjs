// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { SERVICE_CATEGORY_ORDER } from './src/data/servicePages';

// https://astro.build/config
export default defineConfig({
  site: 'https://calkawood.pl',

  output: 'server',

  integrations: [
    react(),
    sitemap({
      // Panel /admin ma meta robots noindex (patrz src/pages/admin/*.astro) —
      // pomijamy go też w sitemapie, żeby nie wysyłać Google sprzecznego sygnału.
      filter: (page) => !page.includes('/admin/'),
      // /uslugi/[category] jest celowo bez prerender (patrz komentarz w tym
      // pliku), więc sitemap nie wykrywa go automatycznie — dopisujemy ręcznie.
      customPages: SERVICE_CATEGORY_ORDER.map(
        (category) => `https://calkawood.pl/uslugi/${category}/`
      ),
    }),
  ],

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