# Intelligence layer (Phase 4)

## Overview

Phase 4 computes personal statistics, insights, recommendations, Decision Scores, calendars, and year/month recaps from existing Phase 3 library data. No AI.

## Modules

| Module | Path |
| --- | --- |
| Load raw data | `src/lib/intelligence/load-profile.ts` |
| Stats engine | `src/lib/intelligence/stats-engine.ts` |
| Insights | `src/lib/intelligence/insights.ts` |
| Decision Score | `src/lib/intelligence/decision-score.ts` |
| Recommendations | `src/lib/intelligence/recommendations.ts` |
| Calendar heatmap | `src/lib/intelligence/calendar.ts` |
| Wrapped / recap | `src/lib/intelligence/wrapped.ts` |
| Dashboard assembly | `src/lib/intelligence/dashboard.ts` |

> `recommendations.ts` here is the dashboard's lightweight genre/popularity rail.
> The personalized recommendation engine behind `/recommendations` is a separate
> subsystem in `src/lib/recommendations/` — see [recommendations.md](./recommendations.md).

## Routes

| Path | Purpose |
| --- | --- |
| `/dashboard` | Intelligence home |
| `/stats` | Full statistics + charts |
| `/insights` | Insight cards |
| `/calendar` | Year heatmap |
| `/timeline` | Grouped activity timeline |
| `/wrapped` | Year in review |
| `/recap` | Monthly recap |

## Decision Score

Computed on movie/TV detail pages from:

- TMDB vote / popularity
- Genre match vs user favorites
- Runtime preference
- Decade preference
- Similarity to high-rated library titles
- Already-watched penalties

Explainable reasons list is returned with the score.

## Performance

- Single parallel fetch of personal tables (capped limits)
- In-memory aggregation (no N+1)
- Catalog rails cached via TMDB client revalidate
- Genres stored on `library_entries.metadata` when journal actions run

## Charts

Recharts (client components) for pie, bar, and area charts with accessible `role="img"` shells.
