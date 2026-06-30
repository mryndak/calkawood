import { defineMiddleware } from 'astro:middleware';
import { getSecurityHeaders } from '@/lib/security';
import { isAuthenticated } from '@/lib/admin-auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const pathname = url.pathname;

  // Ochrona ścieżek /admin/* (oprócz strony logowania i API logowania)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAuthenticated(request)) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/login' },
      });
    }
  }

  const response = await next();
  const headers = getSecurityHeaders();

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
});
