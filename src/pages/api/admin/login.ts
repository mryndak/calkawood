import type { APIRoute } from 'astro';
import {
  verifyPassword,
  createSession,
  getSessionCookieHeader,
} from '@/lib/admin-auth';

export const POST: APIRoute = async ({ request }) => {
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
