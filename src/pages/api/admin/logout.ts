import type { APIRoute } from 'astro';
import {
  destroySession,
  parseCookies,
  getClearSessionCookieHeader,
  SESSION_COOKIE_NAME,
} from '@/lib/admin-auth';

export const POST: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];

  destroySession(token);

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': getClearSessionCookieHeader(),
    },
  });
};
