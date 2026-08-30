import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy, built from the origins this app actually uses.
 *
 * Every source below is here because something in the codebase needs it:
 *   - `https://www.youtube.com` in script-src: hero-trailer-backdrop.tsx injects
 *     `https://www.youtube.com/iframe_api` into the document.
 *   - frame-src YouTube: trailer embeds (video-player.tsx, format.ts).
 *   - img-src hosts: exactly the `images.remotePatterns` above, plus
 *     `i.ytimg.com` for YouTube poster frames and data:/blob: for the shimmer
 *     placeholders and object URLs.
 *   - connect-src Supabase over https and wss: REST, auth, and realtime from the
 *     browser client.
 * Resources fetched *inside* the YouTube iframe are governed by YouTube's own
 * policy, not this one, so googlevideo and friends are deliberately absent.
 *
 * ## Honest limitation
 *
 * `script-src` keeps `'unsafe-inline'`. Next.js emits inline bootstrap and RSC
 * payload scripts, and the theme-init script in app/layout.tsx runs inline
 * before paint to avoid a flash of the wrong theme. A nonce would let us drop
 * `'unsafe-inline'`, but a nonce must be generated per request in middleware and
 * threaded into every inline script — and browsers *ignore* `'unsafe-inline'`
 * once a nonce is present, so a half-applied migration breaks the app silently.
 * That is a bigger change than this pass should make.
 *
 * So this policy is not an XSS backstop. What it does buy, which the app had
 * none of before: script loading is restricted to two origins, `object-src` and
 * `base-uri` close tag-injection vectors, `form-action` prevents a injected form
 * from posting credentials off-origin, and `connect-src` stops exfiltration to
 * an arbitrary collector. Those are the steps an injected payload usually needs.
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    // 'unsafe-eval' is required by Turbopack's dev runtime only.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "https://www.youtube.com",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://image.tmdb.org",
      "https://*.supabase.co",
      "https://lh3.googleusercontent.com",
      "https://avatars.githubusercontent.com",
      "https://i.ytimg.com",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      // Dev server HMR socket.
      ...(isDev ? ["ws:", "http://localhost:*"] : []),
    ],
    "frame-src": ["https://www.youtube.com", "https://www.youtube-nocookie.com"],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };

  const serialised = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Only meaningful over TLS; in dev it would break http://localhost.
  return isDev ? serialised : `${serialised}; upgrade-insecure-requests`;
}

/**
 * Next.js configuration for Frame.
 * Tuned for production performance, image optimization, and security headers.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /*
   * Next blocks dev-only resources (/_next/webpack-hmr and friends) when the
   * request origin is not the one the server considers canonical. Opening the
   * app on 127.0.0.1 while the server reports localhost silently breaks HMR and
   * hydration, which looks exactly like a page that loads forever.
   *
   * Development only; it has no effect on a production build. Add a LAN address
   * here too if you test from a phone on the same network.
   */
  allowedDevOrigins: ["localhost", "127.0.0.1", "[::1]"],
  images: {
    // Bypass Vercel Image Optimization — free/hobby plans can return
    // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED (402) and break all posters.
    // The custom loader asks TMDB's CDN for the width Next actually needs.
    loader: "custom",
    loaderFile: "./src/lib/media/image-loader.ts",
    // Every candidate width below is a size TMDB actually serves, so each
    // srcset entry resolves to a real image instead of a 400. Keep these in
    // sync with TMDB_WIDTHS in src/lib/media/image-loader.ts.
    imageSizes: [45, 92, 154, 185],
    deviceSizes: [300, 342, 500, 780, 1280],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy() },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        { key: "Content-Type", value: "application/manifest+json" },
        { key: "Cache-Control", value: "public, max-age=86400" },
      ],
    },
  ],
};

export default nextConfig;
