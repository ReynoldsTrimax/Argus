/* Argus service worker — offline fallback only; never pin stale app HTML/CSS */
const CACHE = "argus-shell-v4";
const OFFLINE = "/offline";

/**
 * Local development is never served from this worker.
 *
 * The worker only *registers* in production, but once registered it controls
 * the whole origin — including `localhost:3000` under `next dev`. Turbopack
 * reuses dev chunk filenames across rebuilds, so caching `/_next/static/`
 * there pins stale JS against fresh HTML and hydration hangs forever.
 */
const IS_LOCALHOST = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
  self.location.hostname,
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE, "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (IS_LOCALHOST) return;

  const url = new URL(request.url);

  // Never intercept API, auth, or cross-origin
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/movie") ||
    url.pathname.startsWith("/tv") ||
    url.pathname.startsWith("/discover") ||
    url.pathname.startsWith("/library")
  ) {
    // Always network for app routes — avoid stale UI after deploy
    return;
  }

  // Navigation: network-only (offline → offline page). Do NOT cache HTML.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE).then((r) => r || Response.error())),
    );
    return;
  }

  /*
   * Hashed Next static assets — stale-while-revalidate.
   *
   * Serving from cache keeps navigation instant, but the request is always
   * replayed in the background so a bad or superseded entry heals itself on the
   * next load instead of being pinned until the cache name changes.
   */
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch((err) => {
            if (cached) return cached;
            throw err;
          });

        if (cached) {
          event.waitUntil(network.catch(() => {}));
          return cached;
        }
        return network;
      }),
    );
  }
});
