/** Commented by Desmond @ 16-May-26
 * @file next.config.js
 * @description Next.js configuration for the Swinburne Asset Tracking System
 * 
 * Key configurations
 * -------------------
 * serverExternalPackages: ['canvas', 'bwip-js']
 *    The 'canvas' npm package ships a native Node.js binary (.node file compiled with
 *    node-gyp). Vercel's bundler (which uses esbuild/webpack under the hood) cannot
 *    bundle native binaries. Therefore, attempting to do so produces a build error or 
 *    a silently broken runtime module.
 * 
 *    The previous workaround was to mark 'canvas' as an optional dependency in 
 *    package.json so that the build would not fail. However, at runtime on Vercel, the
 *    optional import resolved to an empty shim rather than the real package, causing
 *      (a) createCanvas() to be undefined causing bwip-js to fall back to its internal
 *          canvas shim which does not support fillText + square-block characters in 
 *          every generated PNGs.
 *      (b) loadImage() to be undefined and causing unhandled TypeError at runtime
 * 
 * The correct fix for this is to
 *    1. Move 'canvas' back to regular 'dependencies' in package.json (not optional,
 *       not devDependencies).
 *    2. Add it to 'serverExternalPackages' here so Next.js/Vercel tells the bundler to
 *       not bundle this package
 * 
 * 'bwip-js' is included for the same reason 
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for highlighting potential problems

  // ------------------------------------------------------------------------------
  //                          Server external packages
  // ------------------------------------------------------------------------------
  /**
   * Packages listed hee are NOT bundled by the Next.js/Vercel bundler
   * Instead, they are required at runtime from node_modules, which is the only safe way
   * to load packages that contain native Node.js binaries
   * 
   * Rule of thumb: any package that uses node-gyp / node-pre-gyp, ships a .node file
   * or dynamically require the system libraries to be listed here.
   */
  serverExternalPackages: [
    'canvas', // Native 2D canvas for server-side PNG generation
    'bwip-js' // Barcode generator (uses native code paths on Node.js)
  ],


  // ------------------------------------------------------------------------------
  //                              Image optimization
  // ------------------------------------------------------------------------------
  /** 
   * Allow Next.js <Image> to proxy and optimize images hosted on Supabase Storage.
   * Only supabase.co is whitelisted to prevent the image proxy from being abused as  
   * an open redirect or proxy for arbitrary URLs.
   */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**'
      }
    ]
  },


  // ------------------------------------------------------------------------------
  //                              Security headers
  // ------------------------------------------------------------------------------
  async headers() { // Define custom HTTP headers for security
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",

        headers: [
          { 
            key: "Referrer-Policy",  // Controls referrer information sent with requests
            value: "strict-origin-when-cross-origin" 
          }, 
          { 
            key: "X-Frame-Options", // Prevents site from being embedded in <iframe></iframe>
            value: "DENY" 
          },
          { 
            key: "X-Content-Type-Options", // Prevents MIME type sniffing
            value: "nosniff" 
          }, // Prevents executing malicious files as scripts
          {
            key: "X-XSS-Protection", // Enables XSS filtering
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security", // Enforces secure (HTTP over SSL/TLS) connections to the server
            value: "max-age=63072000; includeSubDomains; preload", // 2 years, applies to subdomains, preload
          },
          {
            key: "Permissions-Policy", // Disable sensitive browser features
            value: "microphone=(), geolocation=()", // Camera not disabled
          }
        ]

      }
    ]
  }
}

// Export security headers for all routes
module.exports = nextConfig
