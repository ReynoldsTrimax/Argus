/**
 * Library entry CRUD and queries.
 */

import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import { logActivity } from "@/lib/library/activity";
import type {
  LibraryEntry,
  LibraryListFilters,
  LibraryListResult,
  MediaIdentity,
  WatchStatus,
} from "@/types/library";

export async function getLibraryEntryByExternal(
  userId: string,
  mediaType: "movie" | "tv",
  externalId: string,
  provider = "tmdb",
): Promise<LibraryEntry | null> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "library_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("media_type", mediaType)
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) {
    console.error("[library] getLibraryEntryByExternal", error.message);
    return null;
  }
  return data as LibraryEntry | null;
}

export async function getLibraryEntryById(
  userId: string,
  entryId: string,
): Promise<LibraryEntry | null> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "library_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    console.error("[library] getLibraryEntryById", error.message);
    return null;
  }
  return data as LibraryEntry | null;
}

/**
 * Upsert a library entry from catalog identity. Creates on first interaction.
 */
export async function ensureLibraryEntry(
  userId: string,
  identity: MediaIdentity,
  defaults?: Partial<{ status: WatchStatus; is_favorite: boolean }>,
): Promise<LibraryEntry> {
  const existing = await getLibraryEntryByExternal(
    userId,
    identity.mediaType,
    identity.externalId,
    identity.provider ?? "tmdb",
  );
  const metaPatch = {
    genres: identity.genres ?? [],
    originalLanguage: identity.originalLanguage ?? null,
  };

  if (existing) {
    // Refresh denormalized metadata
    const supabase = await createClient();
    const { data } = await table(supabase, "library_entries")
      .update({
        title: identity.title,
        original_title: identity.originalTitle ?? null,
        poster_path: identity.posterPath ?? null,
        backdrop_path: identity.backdropPath ?? null,
        release_date: identity.releaseDate?.slice(0, 10) || null,
        overview: identity.overview ?? null,
        runtime_minutes: identity.runtimeMinutes ?? null,
        total_episodes: identity.totalEpisodes ?? existing.total_episodes,
        metadata: { ...(existing.metadata ?? {}), ...metaPatch },
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    return (data as LibraryEntry) ?? existing;
  }

  const supabase = await createClient();
  const status = defaults?.status ?? "plan_to_watch";
  const { data, error } = await table(supabase, "library_entries")
    .insert({
      user_id: userId,
      provider: identity.provider ?? "tmdb",
      media_type: identity.mediaType,
      external_id: identity.externalId,
      title: identity.title,
      original_title: identity.originalTitle ?? null,
      poster_path: identity.posterPath ?? null,
      backdrop_path: identity.backdropPath ?? null,
      release_date: identity.releaseDate?.slice(0, 10) || null,
      overview: identity.overview ?? null,
      runtime_minutes: identity.runtimeMinutes ?? null,
      total_episodes: identity.totalEpisodes ?? null,
      status,
      is_favorite: defaults?.is_favorite ?? false,
      metadata: metaPatch,
      started_at: status === "watching" || status === "rewatching" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create library entry");
  }

  const entry = data as LibraryEntry;
  await logActivity(supabase, userId, {
    activityType: "library_added",
    summary: `Added ${entry.title} to library`,
    entryId: entry.id,
    title: entry.title,
    metadata: { status: entry.status },
  });

  return entry;
}

export async function updateLibraryStatus(
  userId: string,
  entryId: string,
  status: WatchStatus,
): Promise<LibraryEntry> {
  const supabase = await createClient();
  const current = await getLibraryEntryById(userId, entryId);
  if (!current) throw new Error("Library entry not found");

  const patch: Record<string, unknown> = {
    status,
    is_archived: status === "archived",
  };

  if (status === "watching" || status === "rewatching") {
    patch.started_at = current.started_at ?? new Date().toISOString();
    patch.last_watched_at = new Date().toISOString();
    if (status === "rewatching") {
      patch.rewatch_count = (current.rewatch_count ?? 0) + 1;
    }
  }
  if (status === "completed") {
    patch.completed_at = new Date().toISOString();
    patch.progress_percent = 100;
    patch.last_watched_at = new Date().toISOString();
  }

  const { data, error } = await table(supabase, "library_entries")
    .update(patch)
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update status");

  await table(supabase, "library_status_history").insert({
    entry_id: entryId,
    user_id: userId,
    from_status: current.status,
    to_status: status,
  });

  await logActivity(supabase, userId, {
    activityType: status === "completed" ? "finished" : "status_changed",
    summary: `Marked ${current.title} as ${status.replaceAll("_", " ")}`,
    entryId,
    title: current.title,
    metadata: { from: current.status, to: status },
  });

  return data as LibraryEntry;
}

export async function setFavorite(
  userId: string,
  entryId: string,
  isFavorite: boolean,
): Promise<LibraryEntry> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "library_entries")
    .update({ is_favorite: isFavorite })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update favorite");

  const entry = data as LibraryEntry;
  await logActivity(supabase, userId, {
    activityType: isFavorite ? "favorited" : "unfavorited",
    summary: isFavorite
      ? `Favorited ${entry.title}`
      : `Removed ${entry.title} from favorites`,
    entryId,
    title: entry.title,
  });

  return entry;
}

/**
 * Removes a title from the library entirely.
 *
 * Every child table references `library_entries` with `ON DELETE CASCADE`, so
 * this also discards episode progress, watch sessions, rating history, the
 * review and its versions, notes, tag assignments and collection memberships.
 * Callers are responsible for confirming when any of that exists — see
 * `PersonalMediaPanel`, which only removes silently for an entry that holds
 * nothing but a status.
 *
 * The activity record is written after the delete with no `entryId`, so the
 * history keeps a readable trace of the removal instead of a row whose
 * reference was just nulled out by the foreign key.
 */
export async function deleteLibraryEntry(
  userId: string,
  entryId: string,
): Promise<{ title: string | null }> {
  const supabase = await createClient();

  const { data: existing } = await table(supabase, "library_entries")
    .select("title")
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();

  const title = (existing?.title as string | null) ?? null;

  const { error } = await table(supabase, "library_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message ?? "Failed to remove from library");

  await logActivity(supabase, userId, {
    // `activity_type` has no removal member and extending a Postgres enum needs
    // a migration, so the nearest existing member carries it.
    activityType: "status_changed",
    summary: `Removed ${title ?? "a title"} from library`,
    title,
  });

  return { title };
}

export async function setPinned(
  userId: string,
  entryId: string,
  isPinned: boolean,
): Promise<LibraryEntry> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "library_entries")
    .update({ is_pinned: isPinned })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to pin");
  return data as LibraryEntry;
}

export async function setHidden(
  userId: string,
  entryId: string,
  isHidden: boolean,
): Promise<LibraryEntry> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "library_entries")
    .update({ is_hidden: isHidden })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to hide");
  return data as LibraryEntry;
}

export async function setMovieProgress(
  userId: string,
  entryId: string,
  minutes: number,
  runtimeMinutes?: number | null,
): Promise<LibraryEntry> {
  const supabase = await createClient();
  const current = await getLibraryEntryById(userId, entryId);
  if (!current) throw new Error("Not found");

  const runtime = runtimeMinutes ?? current.runtime_minutes;
  const percent =
    runtime && runtime > 0
      ? Math.min(100, Math.round((minutes / runtime) * 10000) / 100)
      : current.progress_percent;

  const { data, error } = await table(supabase, "library_entries")
    .update({
      movie_progress_minutes: minutes,
      progress_percent: percent,
      last_watched_at: new Date().toISOString(),
      status:
        percent >= 100
          ? "completed"
          : current.status === "plan_to_watch" || current.status === "wishlist"
            ? "watching"
            : current.status,
      completed_at: percent >= 100 ? new Date().toISOString() : current.completed_at,
    })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update progress");
  return data as LibraryEntry;
}

export async function listLibrary(
  userId: string,
  filters: LibraryListFilters = {},
): Promise<LibraryListResult> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 24));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = table(supabase, "library_entries")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("is_hidden", false);

  if (filters.mediaType && filters.mediaType !== "all") {
    query = query.eq("media_type", filters.mediaType);
  }

  if (filters.status === "favorites") {
    query = query.eq("is_favorite", true);
  } else if (filters.status === "pinned") {
    query = query.eq("is_pinned", true);
  } else if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  } else {
    query = query.neq("status", "archived");
  }

  if (filters.q?.trim()) {
    query = query.ilike("title", `%${filters.q.trim()}%`);
  }

  switch (filters.sort) {
    case "title":
      query = query.order("title", { ascending: true });
      break;
    case "rating":
      query = query.order("user_rating", { ascending: false, nullsFirst: false });
      break;
    case "added":
      query = query.order("created_at", { ascending: false });
      break;
    case "release":
      query = query.order("release_date", { ascending: false, nullsFirst: false });
      break;
    case "progress":
      query = query.order("progress_percent", { ascending: false });
      break;
    case "updated":
      query = query.order("updated_at", { ascending: false });
      break;
    case "last_watched":
    default:
      query = query.order("last_watched_at", { ascending: false, nullsFirst: false });
      break;
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("[library] listLibrary", error.message);
    return { items: [], total: 0, page, pageSize };
  }

  return {
    items: (data ?? []) as LibraryEntry[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getContinueWatching(
  userId: string,
  limit = 12,
): Promise<LibraryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "library_entries")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["watching", "rewatching", "paused"])
    .eq("is_hidden", false)
    .order("last_watched_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[library] continueWatching", error.message);
    return [];
  }
  return (data ?? []) as LibraryEntry[];
}

export async function searchLibrary(
  userId: string,
  q: string,
  limit = 30,
): Promise<{
  entries: LibraryEntry[];
  notes: { id: string; body: string; entry_id: string; title?: string }[];
  reviews: { id: string; body: string; entry_id: string; title?: string }[];
  tags: { id: string; name: string }[];
  collections: { id: string; name: string; description: string | null }[];
}> {
  const supabase = await createClient();
  const term = q.trim();
  if (!term) {
    return { entries: [], notes: [], reviews: [], tags: [], collections: [] };
  }

  const [entriesRes, notesRes, reviewsRes, tagsRes, collectionsRes] =
    await Promise.all([
      table(supabase, "library_entries")
        .select("*")
        .eq("user_id", userId)
        .ilike("title", `%${term}%`)
        .limit(limit),
      table(supabase, "notes")
        .select("id, body, entry_id")
        .eq("user_id", userId)
        .ilike("body", `%${term}%`)
        .limit(limit),
      table(supabase, "reviews")
        .select("id, body, entry_id")
        .eq("user_id", userId)
        .ilike("body", `%${term}%`)
        .limit(limit),
      table(supabase, "tags")
        .select("id, name")
        .eq("user_id", userId)
        .ilike("name", `%${term}%`)
        .limit(limit),
      table(supabase, "collections")
        .select("id, name, description")
        .eq("user_id", userId)
        .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
        .limit(limit),
    ]);

  return {
    entries: (entriesRes.data ?? []) as LibraryEntry[],
    notes: (notesRes.data ?? []) as { id: string; body: string; entry_id: string }[],
    reviews: (reviewsRes.data ?? []) as { id: string; body: string; entry_id: string }[],
    tags: (tagsRes.data ?? []) as { id: string; name: string }[],
    collections: (collectionsRes.data ?? []) as {
      id: string;
      name: string;
      description: string | null;
    }[],
  };
}
