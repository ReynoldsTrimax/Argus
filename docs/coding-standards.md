# Coding standards

## Principles

- **Server Components by default**; Client Components only for interactivity
- **Feature folders** under `src/features/*` for product domains
- **Domain types** never leak vendor shapes (TMDB stays in `lib/media/providers/tmdb`)
- **Zod** validates all mutations at the boundary
- **RLS** is the authorization source of truth for personal data

## Naming

- Components: `PascalCase.tsx`
- Hooks: `use-*.ts`
- Server actions: `*-actions.ts` with `"use server"`
- DB tables: `snake_case`
- Routes: kebab-case paths, constants in `ROUTES`

## TypeScript

- `strict` + `noUncheckedIndexedAccess`
- Prefer `type` imports
- No `any` except deliberate table helpers (`lib/library/supabase-table.ts`)

## UI

- Tokens via CSS variables in `globals.css`
- Prefer design-system primitives in `components/ui`
- Motion via `animations/*` + `useReducedMotion`
- Focus rings and `aria-*` on interactive controls

## Testing

```bash
npm test           # vitest unit tests
npm run typecheck
npm run lint
npm run build
```

Critical pure logic (stats, decision score, formatters) should have unit tests.

## Git

- Do not commit `.env.local` or secrets
- Prefer small, reviewable commits by phase/feature
