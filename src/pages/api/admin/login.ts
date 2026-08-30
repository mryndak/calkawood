import type { APIRoute } from 'astro';
import {
  verifyPassword,
  createSession,
  getSessionCookieHeader,
} from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Ochrona przed brute-force hasła — bez tego timing-safe porównanie
  // chroni tylko przed atakiem czasowym, nie przed próbami "na ilość".
  const rateCheck = checkRateLimit(`admin-login:${clientAddress}`, 5, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/login?error=ratelimit' },
    });
  }

  const contentType = request.headers.get('content-type') ?? '';

  let password = '';

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    password = (formData.get('password') as string) ?? '';
  } else if (contentType.includes('application/json')) {
    const body = await request.json();
    password = body.password ?? '';
  } else {
    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/login?error=invalid' },
    });
  }

  const adminPassword = import.meta.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[Admin Auth] ADMIN_PASSWORD nie jest ustawione w zmiennych środowiskowych');
    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/login?error=invalid' },
    });
  }

  if (!verifyPassword(password, adminPassword)) {
    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/login?error=invalid' },
    });
  }

  const token = createSession();

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin',
      'Set-Cookie': getSessionCookieHeader(token),
    },
  });
};
