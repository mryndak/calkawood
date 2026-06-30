import type { APIRoute } from 'astro';

const BASE_URL = 'https://calkawood.pl';

interface SitemapEntry {
  url: string;
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const pages: SitemapEntry[] = [
  { url: '/', priority: 1.0, changefreq: 'monthly' },
  { url: '/uslugi/stolarka-na-wymiar', priority: 0.8, changefreq: 'monthly' },
  { url: '/uslugi/tarasy', priority: 0.8, changefreq: 'monthly' },
  { url: '/uslugi/podlogi-i-wnetrza', priority: 0.8, changefreq: 'monthly' },
  { url: '/uslugi/budowa-szkieletowa', priority: 0.8, changefreq: 'monthly' },
  { url: '/realizacje', priority: 0.7, changefreq: 'weekly' },
  { url: '/wycena', priority: 0.9, changefreq: 'monthly' },
  { url: '/o-mnie', priority: 0.5, changefreq: 'monthly' },
  { url: '/kontakt', priority: 0.6, changefreq: 'monthly' },
  { url: '/polityka-prywatnosci', priority: 0.3, changefreq: 'monthly' },
  { url: '/regulamin', priority: 0.3, changefreq: 'monthly' },
];

function buildSitemapXml(entries: SitemapEntry[]): string {
  const today = new Date().toISOString().split('T')[0];

  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${BASE_URL}${entry.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export const GET: APIRoute = () => {
  const body = buildSitemapXml(pages);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
