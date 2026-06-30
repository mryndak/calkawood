import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const content = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /api/',
    '',
    'Sitemap: https://calkawood.pl/sitemap.xml',
  ].join('\n');

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
