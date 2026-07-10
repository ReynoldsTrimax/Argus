import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import { logActivity } from "@/lib/library/activity";
import type { Collection, CollectionItem, LibraryEntry, Tag } from "@/types/library";

export async function listTags(userId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await table(supabase, "tags")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  return (data ?? []) as Tag[];
}

export async function createTag(
  userId: string,
  name: string,
  color?: string | null,
): Promise<Tag> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "tags")
    .insert({
      user_id: userId,
      name: name.trim(),
      color: color ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create tag");
  return data as Tag;
}

export async function assignTag(
  userId: string,
  entryId: string,
  tagId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "tag_assignments").upsert(
    { user_id: userId, entry_id: entryId, tag_id: tagId },
    { onConflict: "tag_id,entry_id" },
  );
  if (error) throw new Error(error.message);

  const { data: tag } = await table(supabase, "tags").select("name").eq("id", tagId).single();
  const { data: entry } = await table(supabase, "library_entries")
    .select("title")
    .eq("id", entryId)
    .single();

  await logActivity(supabase, userId, {
    activityType: "tag_added",
    summary: `Tagged ${entry?.title ?? "title"} as ${tag?.name ?? "tag"}`,
    entryId,
    title: entry?.title,
  });
}

export async function removeTagAssignment(
  userId: string,
  entryId: string,
  tagId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "tag_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .eq("tag_id", tagId);
  if (error) throw new Error(error.message);
}

export async function getTagsForEntry(userId: string, entryId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await table(supabase, "tag_assignments")
    .select("tag_id, tags(*)")
    .eq("user_id", userId)
    .eq("entry_id", entryId);

  if (!data) return [];
  return data
    .map((row: { tags: Tag | Tag[] | null }) =>
      Array.isArray(row.tags) ? row.tags[0] : row.tags,
    )
    .filter(Boolean) as Tag[];
}

export async function listCollections(userId: string): Promise<Collection[]> {
  const supabase = await createClient();
  const { data } = await table(supabase, "collections")
    .select("*")
    .eq("user_id", userId)
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  return (data ?? []) as Collection[];
}

export async function getCollection(
  userId: string,
  collectionId: string,
): Promise<Collection | null> {
  const supabase = await createClient();
  const { data } = await table(supabase, "collections")
    .select("*")
    .eq("user_id", userId)
    .eq("id", collectionId)
    .maybeSingle();
  return (data as Collection) ?? null;
}

export async function createCollection(
  userId: string,
  name: string,
  description?: string | null,
): Promise<Collection> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "collections")
    .insert({
      user_id: userId,
      name: name.trim(),
      description: description ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create collection");

  const collection = data as Collection;
  await logActivity(supabase, userId, {
    activityType: "collection_created",
    summary: `Created collection “${collection.name}”`,
    collectionId: collection.id,
    title: collection.name,
  });

  return collection;
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  patch: Partial<Pick<Collection, "name" | "description" | "cover_path" | "is_pinned" | "sort_order">>,
): Promise<Collection> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "collections")
    .update(patch)
    .eq("id", collectionId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update collection");
  return data as Collection;
}

export async function deleteCollection(
  userId: string,
  collectionId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function addToCollection(
  userId: string,
  collectionId: string,
  entryId: string,
  position?: number,
): Promise<void> {
  const supabase = await createClient();
  const { data: maxPos } = await table(supabase, "collection_items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await table(supabase, "collection_items").upsert(
    {
      user_id: userId,
      collection_id: collectionId,
      entry_id: entryId,
      position: position ?? ((maxPos?.position as number | undefined) ?? -1) + 1,
    },
    { onConflict: "collection_id,entry_id" },
  );
  if (error) throw new Error(error.message);

  const { data: collection } = await table(supabase, "collections")
    .select("name")
    .eq("id", collectionId)
    .single();
  const { data: entry } = await table(supabase, "library_entries")
    .select("title")
    .eq("id", entryId)
    .single();

  await logActivity(supabase, userId, {
    activityType: "collection_item_added",
    summary: `Added ${entry?.title ?? "title"} to ${collection?.name ?? "collection"}`,
    entryId,
    collectionId,
    title: entry?.title,
  });
}

export async function removeFromCollection(
  userId: string,
  collectionId: string,
  entryId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "collection_items")
    .delete()
    .eq("user_id", userId)
    .eq("collection_id", collectionId)
    .eq("entry_id", entryId);
  if (error) throw new Error(error.message);
}

export async function reorderCollectionItems(
  userId: string,
  collectionId: string,
  orderedEntryIds: string[],
): Promise<void> {
  const supabase = await createClient();
  await Promise.all(
    orderedEntryIds.map((entryId, index) =>
      table(supabase, "collection_items")
        .update({ position: index })
        .eq("user_id", userId)
        .eq("collection_id", collectionId)
        .eq("entry_id", entryId),
    ),
  );
}

export async function listCollectionItems(
  userId: string,
  collectionId: string,
): Promise<(CollectionItem & { library_entries: LibraryEntry })[]> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "collection_items")
    .select("*, library_entries(*)")
    .eq("user_id", userId)
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  if (error) {
    console.error("[collections] list items", error.message);
    return [];
  }

  return (data ?? []) as (CollectionItem & { library_entries: LibraryEntry })[];
}

export async function getCollectionsForEntry(
  userId: string,
  entryId: string,
): Promise<Collection[]> {
  const supabase = await createClient();
  const { data } = await table(supabase, "collection_items")
    .select("collections(*)")
    .eq("user_id", userId)
    .eq("entry_id", entryId);

  if (!data) return [];
  return data
    .map((row: { collections: Collection | Collection[] | null }) =>
      Array.isArray(row.collections) ? row.collections[0] : row.collections,
    )
    .filter(Boolean) as Collection[];
}
