import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth =
    pathname.startsWith('/chat') || pathname.startsWith('/api/chat');

  if (!needsAuth) return NextResponse.next();

  // Basic認証（任意、併用可）
  const u = process.env.BASIC_AUTH_USER;
  const p = process.env.BASIC_AUTH_PASS;
  if (u && p) {
    const h = req.headers.get('authorization') || '';
    const ok = h.startsWith('Basic ') &&
      Buffer.from(h.split(' ')[1], 'base64').toString() === `${u}:${p}`;
    if (!ok) {
      return new NextResponse('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="protected"' }
      });
    }
  }

  // NextAuthで未ログインを弾く（簡易：cookie存在チェック）
  const loggedIn = req.cookies.get('__Secure-next-auth.session-token') || req.cookies.get('next-auth.session-token');
  if (!loggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/chat/:path*','/api/chat/:path*'] };