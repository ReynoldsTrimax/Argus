# Contributing to Frame

## Setup

See [docs/installation.md](./docs/installation.md) and [README.md](./README.md).

```bash
npm install
cp .env.example .env.local
# fill Supabase + TMDB keys
npm run dev
```

## Workflow

1. Branch from `main`
2. Keep changes focused (prefer phase-aligned PRs)
3. Run before push:

```bash
npm run validate
npm test
npm run build
```

## Standards

Follow [docs/coding-standards.md](./docs/coding-standards.md).

## Architecture

- Overview: [docs/architecture.md](./docs/architecture.md)
- Catalog: [docs/catalog.md](./docs/catalog.md)
- Library: [docs/library.md](./docs/library.md)
- Intelligence: [docs/intelligence.md](./docs/intelligence.md)
- Security: [docs/security.md](./docs/security.md)

## Pull requests

- Describe **what** and **why**
- Note migrations that must be applied
- Screenshots for UI-facing changes
