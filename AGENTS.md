# Frame — Agent notes

## Product

Frame is a premium personal entertainment tracking app.

**Phase 1** — foundation  
**Phase 2** — catalog/discovery  
**Phase 3** — personal library  
**Phase 4** — intelligence  
**Phase 5** — polish / PWA / shortcuts / tests / docs

Do **not** implement AI assistants, social features, or public sharing until explicitly requested.

## Stack

Next.js App Router, React 19, TypeScript strict, Tailwind v4, Radix/shadcn-style UI, Framer Motion, Supabase Auth + Postgres, Zod, RHF, TanStack Query, Vercel.

## Conventions

- Server Components by default; Client Components only for interactivity
- Feature code lives in `src/features/*`; shared UI in `src/components/*`
- Mutations via Server Actions with Zod validation
- Data access via `src/lib/services` and `src/lib/supabase`
- Route constants in `src/constants/routes.ts`
- Design tokens in `src/app/globals.css` (CSS variables)
- Auth session proxy: `src/proxy.ts`

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run validate
```

## Media catalog

- Domain types: `src/types/media.ts`
- Provider interface: `src/lib/media/providers/types.ts`
- TMDB adapter: `src/lib/media/providers/tmdb/`
- Facade: `src/lib/media/catalog.ts`
- UI must not import TMDB raw types

## Personal library

- Types: `src/types/library.ts`
- Services: `src/lib/library/*`
- Actions: `src/features/library/actions/library-actions.ts`
- Detail UI: `PersonalMediaPanel` on movie/TV pages
- Docs: `docs/library.md`

## Intelligence

- Types: `src/types/intelligence.ts`
- Services: `src/lib/intelligence/*`
- UI: `src/features/intelligence/components/*`
- Docs: `docs/intelligence.md`

## Database

Apply migrations in order under `database/migrations/` (001 → 002 → 003).
