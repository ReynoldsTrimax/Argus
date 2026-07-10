# Architecture — Phase 1 Foundation

## Goals

Frame is built as a long-lived product, not a prototype. Phases 1–5 establish:

1. A **premium design system** with tokens and reusable primitives
2. **Supabase Auth** with secure SSR sessions
3. A **scalable Postgres schema** for users, profiles, settings, preferences
4. An **application shell** that later phases plug into
5. Clear **boundaries** so media features can land without rewrites

## Layering

```text
app/ (routes, layouts, loading, error)
  → features/ (auth, profile, settings, command)
    → lib/services (server data access)
      → lib/supabase (clients)
        → PostgreSQL + RLS
```

- **UI** never talks to Supabase directly from random components; prefer services or feature actions.
- **Server Actions** own mutations (`features/*/actions`).
- **Server Components** own initial data loading.
- **Client Components** own interactivity (forms, menus, command palette, theme).

## Routing map

| Group | Paths | Audience |
| --- | --- | --- |
| `(marketing)` | `/` | Public landing |
| `(auth)` | `/login`, `/signup` | Guests (redirect if signed in) |
| `(app)` | `/dashboard`, library, catalog, stats, settings, … | Authenticated |
| system | `/auth/callback`, `/offline`, `not-found`, `error` | Infrastructure |

Protected routes are listed in `src/constants/routes.ts` and enforced in `src/proxy.ts`.

## Auth flow

1. User signs in via email/password or OAuth
2. Supabase sets HTTP-only cookies via `@supabase/ssr`
3. Middleware calls `getUser()` to refresh/validate the session
4. Protected routes redirect to `/login?next=…`
5. Auth routes redirect signed-in users to `/dashboard`
6. `handle_new_user` trigger creates profile + settings + preferences rows

## Design system

Tokens live in `src/app/globals.css` as HSL CSS variables:

- Semantic colors (`background`, `primary`, `muted`, …)
- Radius, shadow, motion durations
- Glass surfaces and mesh gradients
- Dark theme: OLED-near blacks with readable muted text

Primitives in `src/components/ui` follow shadcn patterns (CVA + Radix).

## Command / search architecture

`features/command/command-palette.tsx` is the shell:

- **Today**: navigation, theme, placeholders
- **Later**: add a media search group backed by TanStack Query  
  - Debounce `CommandInput`  
  - Keep result components in `features/search`  
  - Do not couple media fetching to palette open state beyond a enabled query flag

## State inventory

| State | Owner | Notes |
| --- | --- | --- |
| Sidebar / command open | `UIProvider` | Local + localStorage for sidebar |
| Theme | `next-themes` | Instant class toggle, no FOUC script |
| Session | Supabase cookies | Server source of truth |
| Profile / settings | Postgres | Loaded in Server Components |
| Future media cache | TanStack Query | Query keys namespaced per feature |

## Database extension plan

Phase 1 tables only:

- `profiles`
- `user_settings`
- `user_preferences`

Recommended future modules (new migrations):

```text
media_titles → watch_entries → lists → reviews → recommendation_scores
```

Use UUID PKs, `created_at` / `updated_at`, and RLS from day one of each module.

## Performance posture

- Server Components by default
- `optimizePackageImports` for heavy icon/UI packages
- Fonts with `display: "swap"`
- Image remote patterns preconfigured for Supabase + OAuth + TMDB
- Lazy client boundaries only where interactivity requires them
- Suspense + route-level `loading.tsx` skeletons
- Progressive poster images with shimmer
- DB indexes in migrations `003` + `004`
- PWA shell caching (static + offline page only)

## Security posture

- RLS on all user tables
- Anon key only on the client
- Proxy never trusts `getSession()` alone for auth decisions
- Security headers + HSTS in `next.config.ts`
- Zod validation on all form mutations
- See `docs/security.md`

## Phase map

| Phase | Layer |
| --- | --- |
| 1 | Shell, auth, design system |
| 2 | Catalog / TMDB / search |
| 3 | Personal library |
| 4 | Intelligence / stats / Decision Score |
| 5 | Polish, PWA, shortcuts, tests, docs |
