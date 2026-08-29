# Frame

**Your cinematic entertainment hub.**

Frame is a premium personal entertainment tracking web application — a central place to discover, organize, track, review, and analyze every movie, TV show, anime, documentary, or limited series you watch.

> **Phases 1–5** — Foundation through intelligence, plus **production polish**: PWA, keyboard shortcuts, refined motion, tests, security docs, and deployment readiness.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) + React + TypeScript (strict) |
| Styling | Tailwind CSS v4 + CSS variable design tokens |
| Components | shadcn-style Radix primitives + Framer Motion |
| Auth & DB | Supabase (Auth + PostgreSQL + RLS) |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query |
| Deploy | Vercel-ready |

---

## Features

### Phase 1 — Foundation
- **Authentication** — Google, GitHub, and email/password via Supabase Auth
- **Secure sessions** — cookie-based SSR clients, proxy protection, OAuth callback
- **Profiles & settings** — auto-provisioned on signup
- **Design system & theming** — OLED dark only (no light mode), zero-flash
- **App shell** — collapsible sidebar, responsive nav, user menu

### Phase 2 — Catalog
- **Provider-agnostic media layer** — TMDB adapter; ready for Watchmode / OMDb / etc.
- **Global search (⌘K)** — movies, TV, people, collections, companies, genres
- **Discover home** — trending, popular, now playing, top rated, genres, editor’s picks
- **Detail pages** — cinematic movie / TV / person / collection experiences
- **Galleries & trailers** — fullscreen image viewer, YouTube embeds
- **Modular ratings & streaming** — TMDB live; other sources as placeholders
- **Filters & browse** — genre, year, language, rating, runtime, sort

### Phase 3 — Personal library
- **Library entries** — watching, completed, paused, dropped, wishlist, rewatching, etc.
- **Progress** — movie minutes, TV episode/season tracking, continue watching
- **Watch sessions** — analytics-ready history
- **Ratings with history** — never overwrite past scores
- **Reviews & private notes** — markdown-friendly, spoiler flag
- **Tags & collections** — unlimited custom organization
- **Favorites, watchlist, history, activity**
- **Library search** — titles, notes, reviews, tags, collections
- **Import/export scaffold** — Letterboxd/Trakt ready architecture

### Phase 4 — Intelligence
- **Dashboard** — continue watching, rails, insights, recommendations, activity
- **Statistics engine** — hours, streaks, distributions, completion rates
- **Charts** — genre, ratings, monthly/weekly activity (Recharts)
- **Calendar heatmap** — GitHub-style year view
- **Timeline** — searchable, filterable journal
- **Decision Score** — explainable per-title score
- **Non-AI recommendations** — genre / history based
- **Wrapped + monthly recap**
- **Smart library filters** — rating, year range, genre, runtime

### Phase 5 — Production polish
- **PWA** — installable, offline shell, app icons, service worker
- **Keyboard shortcuts** — ⌘K, `/`, `G` then `D`/`L`/`C`/…
- **Command palette** — full navigation + search
- **Motion** — page transitions, poster lift, reduced-motion safe
- **Progressive images** — shimmer → fade-in
- **Settings** — shortcuts reference, local display prefs, privacy notes
- **Tests** — Vitest unit tests for stats, decision score, formatters
- **Docs** — security, deployment, standards, roadmap, CONTRIBUTING

---

## Quick start

### Prerequisites

- Node.js 20+
- npm 10+
- A [Supabase](https://supabase.com) project

### 1. Install

```bash
git clone <repo-url> frame
cd frame
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in values from **Supabase → Project Settings → API**:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only, optional for Phase 1) |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | `Frame` |

See [docs/environment.md](./docs/environment.md) for full details.

### 3. Database

In the Supabase SQL editor, run in order:

```text
database/migrations/001_foundation.sql
database/migrations/002_search_history.sql
database/migrations/003_personal_library.sql
database/migrations/004_performance_indexes.sql
```

### 3b. TMDB (catalog)

1. Create an API key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Set in `.env.local`:

```env
TMDB_API_KEY=your_v3_key
# or
TMDB_READ_ACCESS_TOKEN=your_v4_token
```

See [docs/catalog.md](./docs/catalog.md) for architecture details.

### 4. Auth providers

In Supabase **Authentication → Providers**:

1. Enable **Email**
2. Enable **Google** (set Client ID / Secret; redirect URL: `https://<project>.supabase.co/auth/v1/callback`)
3. Enable **GitHub** similarly

Add your site URL and redirect URLs under **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` (dev) / production URL
- Redirect: `http://localhost:3000/auth/callback`

### 5. Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Quality checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm test` | Vitest unit tests |
| `npm run validate` | typecheck + lint + tests |

---

## Project structure

```text
src/
  app/                 # App Router routes (marketing, auth, app)
  animations/          # Shared Framer Motion variants
  components/
    ui/                # Design system primitives
    layout/            # Shell, nav, header, logo
    feedback/          # Empty, error, loaders
  constants/           # Routes, navigation, app metadata
  features/            # Feature modules (auth, profile, settings, command)
  hooks/               # Client hooks
  lib/
    supabase/          # Browser / server / middleware clients
    services/          # Server data access
    validations/       # Zod schemas
    utils/             # cn, formatters
    env.ts             # Zod env validation
  providers/           # Theme, Query, UI state
  types/               # Database + shared types
  proxy.ts             # Session refresh + route guards (Next.js Proxy)
database/
  migrations/          # SQL foundation schema
docs/                  # Architecture & environment docs
```

---

## Architecture notes

### State separation

| Kind | Where |
| --- | --- |
| UI chrome (sidebar, command palette) | `UIProvider` |
| Theme | `next-themes` |
| Auth session | Supabase cookies + middleware |
| Server/async data | TanStack Query (scaffold) + Server Components |
| Preferences | Postgres `user_settings` / `user_preferences` |

### Extension points (later phases)

Do **not** partially implement these yet. Tables and modules should be added cleanly when needed:

- Media catalog (`media_titles`, genres, people, credits)
- Watch history / status
- Lists, collections, watchlists
- Reviews & ratings
- Recommendations & analytics

The command palette already has a dedicated group reserved for entertainment search.

### Accessibility

- Semantic HTML and landmarks
- Focus-visible rings
- Skip link
- Reduced-motion CSS media query
- WCAG AA–oriented contrast tokens

---

## Deployment (Vercel)

1. Import the repo into Vercel
2. Set the same environment variables as `.env.example`
3. Point Supabase auth redirect URLs at your production domain
4. Deploy — `npm run build` is the default build command

---

## License

Private / unlicensed unless otherwise specified.
