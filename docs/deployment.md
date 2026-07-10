# Deployment guide

## Vercel

1. Import the Git repository into Vercel.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `npm run build`
4. Output: default Next.js.

### Environment variables

Set in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon public key |
| `NEXT_PUBLIC_APP_URL` | Yes | Production origin, e.g. `https://frame.example.com` |
| `NEXT_PUBLIC_APP_NAME` | No | Defaults to Frame |
| `TMDB_API_KEY` or `TMDB_READ_ACCESS_TOKEN` | Yes for catalog | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Never expose to client |

See `docs/environment.md`.

### Supabase production checklist

1. Run migrations `001` → `004` in order.
2. Auth → URL configuration: site URL + `https://your-domain/auth/callback`
3. Enable Google / GitHub / Email providers.
4. Confirm RLS enabled on all personal tables.

### Post-deploy

- Visit `/` and `/dashboard`
- Install as PWA (Chrome/Edge: install prompt; iOS: Share → Add to Home Screen)
- Service worker registers only in **production** builds

### Monitoring hooks (future)

Error reporting can plug into `app/error.tsx` (`console.error` already logs digests).
Recommended: Sentry or Vercel Analytics via env flags without blocking render.
