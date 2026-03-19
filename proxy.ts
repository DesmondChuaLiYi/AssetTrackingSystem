/** Commented by Desmond @ 18-Mar-26
 * middleware.ts
 * 
 * Auth strategy: next-auth JWT mode.
 *   next-auth manages its own encrypted 'next-auth.session-token' cookie.
 *   The middleware reads the decrypted token via request.nextauth.token.
 *   token.role and token.staffId are embedded in NextAuth jwt() callback:
 *
 *     callbacks: {
 *       jwt({ token, user }) {
 *         if (user) {
 *           token.role    = user.role     // 'admin' | 'staff'
 *           token.staffId = user.staffId
 *         }
 *         return token
 *       }
 *     }
 *
 * Route layout:
 *   /login          — public, no auth required
 *   /register       — public, no auth required
 *   /unauthorized   — public, shown when a role check fails
 *   /dashboard      — authenticated, immediately redirects to role dashboard
 *   /admin/*        — authenticated + role === 'admin' only
 *   /user/*         — authenticated, any role
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiters
/**
 * Redis client — connects to Upstash over HTTP.
 *
 * Upstash Redis uses a REST API rather than a persistent TCP connection,
 * which is why it works in the Edge Runtime where normal TCP sockets are
 * not available. The SDK reads UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN from environment variables automatically.
 */
const redis = new Redis ({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UNSTASH_REDIS_REST_TOKEN!
})

// Global limit
/**
 * GLOBAL_LIMIT — broad traffic cap, applied to every request.
 *
 * 200 requests per minute per IP.
 * A normal user navigating the app will never hit this.
 * A bot hammering the server will be blocked within seconds.
 *
 * Ratelimit.slidingWindow(200, '1 m'):
 *   200  — maximum requests allowed
 *   '1 m' — over a sliding 1-minute window
 */
const GLOBAL_LIMIT = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1m'),
  analytics: true,
  prefix: 'rl:global'
})

// Sensitive limit
/**
 * 10 requests per minute per IP
 * Applied to /login, /register, and /api/sessions/* routes
 * Prevents brute force attacks (trying many passwords) and credential stuffing
 * (trying leaked username/password from other breaches)
 */
const SENSITIVE_LIMIT = new Ratelimit ({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1m'),
  analytics: true,
  prefix: 'rl:sensitive'
})

// Sensitive paths - routes that get the stricter rate limit
/**
 * Any paths starts with one of these strings get SENSITIVE_LIMIT
 * /login and /register are the front door for credential attacks
 * /api/sessions handles session creation, also a target
 */
const SENSITIVE_PREFIXES = ['/login', '/register', '/api/sessions']

function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// Security headers
function applySecurityHeaders(response: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === 'production'

  /** Click-jacking protection
   * X-Frame-Options: DENY
   * Blocks this page from being embedded inside an <iframe> on any other origin.
   * Prevents clickjacking — where a malicious site overlays your UI invisibly
   * and tricks users into clicking things they didn't intend to.
   */
  response.headers.set('X-Frame-Options', 'DENY')

  /**
   * X-Content-Type-Options: nosniff
   * Stops browsers from guessing the MIME type of a response and overriding
   * the Content-Type header. Prevents MIME-confusion attacks where a file
   * served as text/plain gets executed as JavaScript.
   */
  response.headers.set('X-Content-Type-Options', 'nosniff')

  /** Referrer-Policy: strict-origin-when-cross-origin
   * On same-origin requests: sends the full URL as the Referer header.
   * On cross-origin requests: only sends the origin (e.g. https://myapp.com),
   * never the path or query string. Prevents session tokens or sensitive
   * path segments from leaking to third-party servers via the Referer header.
   */
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  /**
   * Permissions-Policy
   * Explicitly opts out of browser features this app does not use.
   * Even if an XSS attack occurs, the attacker cannot access the
   * microphone, or location without the user granting permission.
   */
  response.headers.set(
    'Permissions-Policy', 
    'microphone=(), geolocation=()'
  )

  /**
   * Strict-Transport-Security (HSTS) — production only
   * Tells browsers to always use HTTPS for this origin for the next year.
   * After the first HTTPS visit, the browser refuses plain HTTP connections
   * even if the user types http:// manually. Only set in production because
   * HTTP dev servers break with this header present.
   */
  if (isProd) {
    // Force HTTPS for 1 year - only safe to set in production
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }

  /** Content-Security-Policy (CSP)
   * Restricts which origins can load scripts, styles, images, and other
   * resources. A strong CSP is a last line of defence against XSS:
   * even if an attacker injects a <script> tag, the browser blocks execution
   * if the source is not on the allowlist.
   * Customise 'script-src' and 'connect-src' to match your CDNs in production.
 */
  // response.headers.set(
  //   'Content-Security-Policy',
  //   [
  //     "default-src 'self'",
  //     "script-src 'self",
  //     "style-src 'self' 'unsafe-inline'", // Needed for Tailwind CSS
  //     "img-src 'self' data: blob:",
  //     "font-src 'self'",
  //     "connect-src 'self'",
  //     "frame-ancestors 'none'",
  //     'upgrade-insecure-requests'
  //   ].join('; ')
  // )
  return response
}

// Rate limit response
/**
 * Builds the 429 Too Many Requests response returned when a limit is exceeded.
 * Retry-After header: tells the client how many seconds to wait before retrying
 * @param reset - Unix timestamp (seconds) when the rate limit window resets
 */
function rateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  const response = NextResponse.json(
    { success: false, error: 'Too many requests. Please wait before trying again.' },
    { status: 429 } // Too many requests
  )
  response.headers.set('Retry-After', String(retryAfter))
  return applySecurityHeaders(response)
}

// Public paths
const PUBLIC_PATHS = new Set(['/login', '/register', 'unauthorized'])

// Returns true if the path is always publicly accessible
// Also covers sub-paths of /unauthorized for nested pages
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true
  }

  if (pathname.startsWith('unauthorized')) {
    return true
  }
  return false
}

// Middleware
export default withAuth(
  /** Commented by Desmond @ 18-Mar-26
   * By the time code reaches here, next-auth has confirmed the
   * user has a valid session token. Therefore we only need to check role
   */
  function middleware(request: NextRequestWithAuth) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    // ------------------------------------------------------------------
    // /dashboard — redirect to the correct role-based dashboard
    // ------------------------------------------------------------------
    if (pathname === '/dashboard') {
      const destination = token?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
      return applySecurityHeaders(
        NextResponse.redirect(new URL(destination, request.url))
      )
    }

    // ------------------------------------------------------------------
    // /admin/* - requires admin role
    // Authenticated user , if their role is not admin, display /unauthorized
    // ------------------------------------------------------------------
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'admin') {
        return applySecurityHeaders(
          NextResponse.redirect(new URL('/unauthorized', request.url))
        )
      }
    }

    // ------------------------------------------------------------------
    // /user/* — any authenticated user passes through
    // ------------------------------------------------------------------
    return applySecurityHeaders(NextResponse.next())
  },

  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl

        // Public pages are always accessible without the need for token
        if (isPublicPath(pathname)) {
          return true
        }

        // Everything else requires a valid next-auth session
        return !!token
      }
    },

    pages: {
      // When authorized() returns false, next-auth redirects here.
      signIn: '/login'
    }
  }
);

// Matcher: Controls which URL paths this middleware runs on at all
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/auth|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)).*)',
  ],
}