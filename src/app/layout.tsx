import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Geist_Mono } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";
import { SkipLink } from "@/components/layout/skip-link";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { APP_METADATA } from "@/constants/app";

import "./globals.css";

/**
 * Body / context face — Source Sans 3 (soft, highly readable).
 * Used for overviews, descriptions, values, forms, meta.
 */
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

/**
 * Display / brand / label face — Geist Mono.
 *
 * The instrument-panel voice: the Argus wordmark, page and rail titles, and
 * every uppercase tracked-out label and numeral. Paired against Source Sans 3
 * for prose, so the two faces stay clearly different jobs.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_METADATA.name} — ${APP_METADATA.tagline}`,
    template: `%s · ${APP_METADATA.name}`,
  },
  description: APP_METADATA.description,
  applicationName: APP_METADATA.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_METADATA.name,
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  keywords: [
    "Argus",
    "entertainment tracker",
    "movies",
    "TV shows",
    "anime",
    "watchlist",
    "reviews",
  ],
  authors: [{ name: APP_METADATA.name }],
  openGraph: {
    type: "website",
    locale: APP_METADATA.locale,
    siteName: APP_METADATA.name,
    title: APP_METADATA.name,
    description: APP_METADATA.description,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_METADATA.name,
    description: APP_METADATA.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* System theme only — no manual override, match OS before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.removeItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-dvh font-sans">
        <SkipLink />
        <AppProviders>
          {children}
          <RegisterServiceWorker />
        </AppProviders>
      </body>
    </html>
  );
}
