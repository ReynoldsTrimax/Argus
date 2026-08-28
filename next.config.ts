import type { NextConfig } from "next";

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
