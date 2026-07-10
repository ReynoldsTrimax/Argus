"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Persist a search query for the authenticated user (best-effort).
 * Requires migration 002_search_history.sql.
 */
export async function recordSearchHistory(query: string): Promise<void> {
  const q = query.trim();
  if (q.length < 2) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("search_history").insert({
      user_id: user.id,
      query: q.slice(0, 200),
    });
  } catch {
    // Table may not exist yet — client still keeps local recent searches.
  }
}

export async function getServerSearchHistory(limit = 10): Promise<string[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("search_history")
      .select("query")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (!data) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of data as { query: string }[]) {
      const key = row.query.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row.query);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
