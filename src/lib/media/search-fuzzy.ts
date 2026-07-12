/**
 * Typo-tolerant search helpers for catalog queries.
 * TMDB search is fairly exact — we expand likely mis-types when the
 * primary query returns nothing.
 */

/** Collapse runs of the same letter to a single / double form. */
function collapseRepeats(s: string, maxRun: 1 | 2): string {
  return s.replace(/(.)\1+/g, (_, ch: string) => ch.repeat(maxRun));
}

/** Damerau–Levenshtein distance for short strings. */
export function editDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const rows = s.length + 1;
  const cols = t.length + 1;
  const d: number[] = new Array(rows * cols).fill(0);
  const at = (i: number, j: number) => d[i * cols + j]!;
  const set = (i: number, j: number, v: number) => {
    d[i * cols + j] = v;
  };

  for (let i = 0; i < rows; i++) set(i, 0, i);
  for (let j = 0; j < cols; j++) set(0, j, j);

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + cost);
      }
      set(i, j, best);
    }
  }
  return at(s.length, t.length);
}

type RankedVariant = { q: string; rank: number };

/**
 * Build alternate queries that still capture what the user likely meant.
 * Lower rank = try first.
 */
export function generateQueryVariants(query: string): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (q.length < 2) return [];

  const ranked: RankedVariant[] = [];
  const seen = new Set<string>();

  const add = (raw: string, rank: number) => {
    const t = raw.trim().replace(/\s+/g, " ");
    if (t.length < 2 || t === q || seen.has(t)) return;
    seen.add(t);
    ranked.push({ q: t, rank });
  };

  // High priority: normalize letter runs ("inceptioon" → "inception")
  add(collapseRepeats(q, 1), 0);
  add(collapseRepeats(q, 2), 1);

  // Trailing mistype / still typing
  if (q.length >= 3) add(q.slice(0, -1), 2);
  if (q.length >= 5) add(q.slice(0, -2), 3);
  if (q.length >= 7) add(q.slice(0, -3), 4);

  // Adjacent swap (fat-finger reorder) — e.g. "batamn" → "batman"
  if (q.length >= 3 && q.length <= 16) {
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i];
      const b = q[i + 1];
      if (a && b) add(q.slice(0, i) + b + a + q.slice(i + 2), 3);
    }
  }

  // Drop one char (extra keystroke)
  if (q.length >= 3 && q.length <= 16) {
    for (let i = 0; i < q.length; i++) {
      add(q.slice(0, i) + q.slice(i + 1), 5);
    }
  }

  // Multi-word: strongest tokens
  const words = q.split(" ").filter((w) => w.length >= 3);
  if (words.length > 1) {
    const byLen = [...words].sort((a, b) => b.length - a.length);
    for (const w of byLen.slice(0, 2)) add(w, 7);
    if (byLen.length >= 2) add(byLen.slice(0, -1).join(" "), 8);
  }

  return ranked
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const da = editDistance(a.q, q);
      const db = editDistance(b.q, q);
      if (da !== db) return da - db;
      return b.q.length - a.q.length;
    })
    .map((x) => x.q)
    .slice(0, 10);
}

/** Higher is better — used to re-rank fuzzy fallback hits. */
export function titleSimilarityScore(title: string, query: string): number {
  const t = title.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!t || !q) return 0;
  if (t === q) return 10_000;
  if (t.startsWith(q)) return 8_000 - (t.length - q.length);
  if (t.includes(q)) return 6_000 - t.indexOf(q);
  if (q.includes(t) && t.length >= 3) return 5_000;

  const head = (t.split(/[\s:·\-–—]+/)[0] ?? t).trim();
  const dist = Math.min(editDistance(t, q), editDistance(head, q));
  const maxLen = Math.max(t.length, q.length, 1);
  const ratio = 1 - dist / maxLen;
  return Math.round(ratio * 4_000) - dist;
}
