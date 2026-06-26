import { NextResponse, type NextRequest } from 'next/server';

const tokenCookie = 'pt_access_token';
const publicPaths = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(tokenCookie)?.value;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isPublic && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublic && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|img/).*)'],
};
