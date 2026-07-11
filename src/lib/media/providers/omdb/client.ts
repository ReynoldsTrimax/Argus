/**
 * OMDb client — IMDb, Rotten Tomatoes, and Metacritic ratings.
 * Free key: https://www.omdbapi.com/apikey.aspx
 */

export interface OmdbRatingSource {
  Source: string;
  Value: string;
}

export interface OmdbResponse {
  Response: "True" | "False";
  Error?: string;
  Title?: string;
  Year?: string;
  imdbID?: string;
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
  Ratings?: OmdbRatingSource[];
  Type?: string;
}

export function isOmdbConfigured(): boolean {
  return Boolean(process.env.OMDB_API_KEY?.trim());
}

async function omdbFetch(params: Record<string, string>): Promise<OmdbResponse | null> {
  const key = process.env.OMDB_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", key);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      // Cache ratings for a day — speeds detail pages on repeat visits
      next: { revalidate: 60 * 60 * 24, tags: ["omdb"] },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn("[omdb] HTTP", res.status);
      return null;
    }
    const data = (await res.json()) as OmdbResponse;
    if (data.Response !== "True") {
      console.warn("[omdb]", data.Error ?? "Response false", params);
      return null;
    }
    return data;
  } catch (error) {
    console.warn(
      "[omdb] fetch failed",
      params,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Fetch OMDb title by IMDb id (e.g. tt0816692).
 */
export async function fetchOmdbByImdbId(
  imdbId: string,
): Promise<OmdbResponse | null> {
  if (!imdbId) return null;
  const id = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  return omdbFetch({ i: id, plot: "short" });
}

/**
 * Fallback title search when IMDb id is missing (less precise).
 */
export async function fetchOmdbByTitle(
  title: string,
  year?: string | null,
  type?: "movie" | "series",
): Promise<OmdbResponse | null> {
  if (!title.trim()) return null;
  const params: Record<string, string> = {
    t: title.trim(),
    plot: "short",
  };
  if (year) params.y = year.slice(0, 4);
  if (type) params.type = type;
  return omdbFetch(params);
}
