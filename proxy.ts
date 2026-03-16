import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    // Redirect /dashboard to role-based dashboard
    if (pathname === '/dashboard') {
      if (token?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/user/dashboard', request.url));
    }

    // Protect /admin routes
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Protect /user routes
    if (pathname.startsWith('/user')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith('/(auth)')) {
          return true;
        }
        if (req.nextUrl.pathname.startsWith('/(app)')) {
          return !!token;
        }
        if (req.nextUrl.pathname === '/dashboard') {
          return !!token; // Allow access but will redirect
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};