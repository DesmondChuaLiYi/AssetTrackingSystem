import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get session cookie (contains role information)
  const sessionCookie = request.cookies.get('user_session')
  const hasSession = !!sessionCookie

  let userRole: string | null = null
  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie.value)
      userRole = sessionData.role
    } catch (error) {
      // Invalid cookie, treat as no session
      console.error('Invalid session cookie:', error)
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/register', '/api/auth', '/api/sessions']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (!hasSession || !userRole) {
    // No session or role → redirect to login
    console.log(`[Middleware] No session for ${pathname}, redirecting to login`)
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  // Admin routes - require admin role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      // User is not admin → show unauthorized page
      console.log(`[Middleware] User role '${userRole}' attempted to access admin route: ${pathname}`)
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }

  // User routes - any authenticated user can access
  if (pathname.startsWith('/user')) {
    // Already checked hasSession above, so allowed
  }

  // Allow the request to proceed
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
