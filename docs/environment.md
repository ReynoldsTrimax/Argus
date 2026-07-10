# Environment variables

Frame validates environment variables with Zod in `src/lib/env.ts`.

## Required (client-safe)

These are embedded in the browser bundle. Never put secrets here.

| Name | Example | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon (public) key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Canonical app origin (OAuth redirects) |
| `NEXT_PUBLIC_APP_NAME` | `Frame` | Product name for UI/metadata |

## Optional (server-only)

| Name | Description |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Full-access key. **Never** expose to the client. Prefer RLS + user sessions; keep for future admin/jobs. |
| `TMDB_API_KEY` | TMDB v3 API key (query param). Required for catalog unless using the token below. |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 read access token (Bearer). Preferred when available. |

## Local setup

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. Do not commit secrets.

## Supabase Auth redirect URLs

| Environment | Site URL | Redirect URLs |
| --- | --- | --- |
| Local | `http://localhost:3000` | `http://localhost:3000/auth/callback` |
| Preview | Vercel preview URL | `https://*.vercel.app/auth/callback` |
| Production | `https://your-domain.com` | `https://your-domain.com/auth/callback` |

OAuth providers (Google, GitHub) must also allow Supabase's callback:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

## CI / production build

Provide the `NEXT_PUBLIC_*` variables in the Vercel (or CI) project settings before `next build`. The app will throw a clear validation error if required vars are missing at runtime.
