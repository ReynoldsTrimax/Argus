/**
 * Export scaffold — builds an Argus JSON snapshot of personal data.
 * UI wiring can call this from Settings in a later iteration.
 */

import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import type { ArgusExportPayload } from "@/features/import-export/types";

export async function buildArgusExport(userId: string): Promise<ArgusExportPayload> {
  const supabase = await createClient();

  const [entries, collections, tags, reviews, notes] = await Promise.all([
    table(supabase, "library_entries").select("*").eq("user_id", userId),
    table(supabase, "collections").select("*").eq("user_id", userId),
    table(supabase, "tags").select("*").eq("user_id", userId),
    table(supabase, "reviews").select("*").eq("user_id", userId),
    table(supabase, "notes").select("*").eq("user_id", userId),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries.data ?? [],
    collections: collections.data ?? [],
    tags: tags.data ?? [],
    reviews: reviews.data ?? [],
    notes: notes.data ?? [],
  };
}

/** @deprecated Use buildArgusExport */
export const buildFrameExport = buildArgusExport;
