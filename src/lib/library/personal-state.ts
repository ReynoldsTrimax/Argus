import {
  getLibraryEntryByExternal,
} from "@/lib/library/entries";
import { getReview, listNotes, getRatingHistory } from "@/lib/library/ratings-reviews-notes";
import { getTagsForEntry, getCollectionsForEntry } from "@/lib/library/tags-collections";
import {
  listWatchSessions,
  recordRecentlyViewed,
  listEpisodeProgress,
} from "@/lib/library/progress-sessions";
import type { MediaIdentity, PersonalMediaState } from "@/types/library";
import { getCurrentUser } from "@/lib/services/user-service";

/**
 * Load full personal state for a catalog title (detail page sidebar).
 */
export async function getPersonalMediaState(
  mediaType: "movie" | "tv",
  externalId: string,
  identity?: MediaIdentity,
): Promise<PersonalMediaState & { userId: string | null }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      userId: null,
      entry: null,
      review: null,
      notes: [],
      tags: [],
      collections: [],
      recentSessions: [],
      ratingHistory: [],
      episodeProgress: [],
    };
  }

  if (identity) {
    void recordRecentlyViewed(user.id, {
      mediaType,
      externalId,
      title: identity.title,
      posterPath: identity.posterPath,
    });
  }

  const entry = await getLibraryEntryByExternal(user.id, mediaType, externalId);
  if (!entry) {
    return {
      userId: user.id,
      entry: null,
      review: null,
      notes: [],
      tags: [],
      collections: [],
      recentSessions: [],
      ratingHistory: [],
      episodeProgress: [],
    };
  }

  const [review, notes, tags, collections, recentSessions, ratingHistory, episodeProgress] =
    await Promise.all([
      getReview(user.id, entry.id),
      listNotes(user.id, entry.id),
      getTagsForEntry(user.id, entry.id),
      getCollectionsForEntry(user.id, entry.id),
      listWatchSessions(user.id, { entryId: entry.id, limit: 5 }),
      getRatingHistory(user.id, entry.id),
      // Only TV titles have episode rows; skip the query for movies.
      mediaType === "tv"
        ? listEpisodeProgress(user.id, entry.id)
        : Promise.resolve([]),
    ]);

  return {
    userId: user.id,
    entry,
    review,
    notes,
    tags,
    collections,
    recentSessions,
    ratingHistory: ratingHistory as PersonalMediaState["ratingHistory"],
    episodeProgress,
  };
}
