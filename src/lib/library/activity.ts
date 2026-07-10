import type { AppSupabase } from "@/lib/library/supabase-table";
import { table } from "@/lib/library/supabase-table";
import type { ActivityType } from "@/types/library";

export async function logActivity(
  client: AppSupabase,
  userId: string,
  input: {
    activityType: ActivityType;
    summary: string;
    entryId?: string | null;
    collectionId?: string | null;
    title?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await table(client, "activity_log").insert({
    user_id: userId,
    activity_type: input.activityType,
    summary: input.summary,
    entry_id: input.entryId ?? null,
    collection_id: input.collectionId ?? null,
    title: input.title ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[activity]", error.message);
  }
}
