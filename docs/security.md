# Security overview

## Authentication

- Supabase Auth with cookie sessions (`@supabase/ssr`)
- Route protection in `src/proxy.ts` via `getUser()` (not `getSession()` alone)
- OAuth callback at `/auth/callback` with safe `next` path validation

## Authorization

- PostgreSQL RLS on all personal tables (`auth.uid() = user_id`)
- Anon key only on the client; service role never bundled

## Input validation

- Zod schemas for auth, profile, settings, library mutations
- Server Actions re-validate before writes

## HTTP hardening

Configured in `next.config.ts`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disables camera/mic/geo by default
- HSTS for production HTTPS

## XSS / injection

- React escapes text by default
- Avoid `dangerouslySetInnerHTML` except the theme boot script (static, no user input)
- Markdown review bodies should be sanitized before HTML render if rich HTML is added later

## Secrets

- `TMDB_*` and `SUPABASE_SERVICE_ROLE_KEY` are server-only
- Documented in `.env.example`; never commit real values

## Rate limiting

- Rely on Supabase + Vercel platform limits today
- Future: edge rate limit on `/api/media/*` if abused

## PWA service worker

- Caches shell and static assets only
- Does not cache `/api/*` or `/auth/*`
