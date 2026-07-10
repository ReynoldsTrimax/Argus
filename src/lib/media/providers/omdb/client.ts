/**
 * OMDb client — IMDb, Rotten Tomatoes, and Metacritic ratings.
 * Free key: https://www.omdbapi.com/apikey.aspx
 *
 * Uses public DNS resolution when system DNS is unreliable (same posture as TMDB client).
 */

import { Resolver } from "node:dns/promises";
import https from "node:https";

const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1", "9.9.9.9"];
const REQUEST_TIMEOUT_MS = 12_000;

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

const resolver = new Resolver();
resolver.setServers(PUBLIC_DNS);

type IpCache = { ips: string[]; expiresAt: number };
let ipCache: IpCache | null = null;

async function resolveHost(hostname: string): Promise<string[]> {
  if (ipCache && ipCache.expiresAt > Date.now()) return ipCache.ips;
  try {
    const ips = await resolver.resolve4(hostname);
    if (ips.length) {
      ipCache = { ips, expiresAt: Date.now() + 5 * 60_000 };
      return ips;
    }
  } catch {
    // fall through
  }
  return [];
}

function httpsGet(url: URL): Promise<{ status: number; body: string }> {
  return new Promise(async (resolve, reject) => {
    const ips = await resolveHost(url.hostname);
    const host = ips[0] ?? url.hostname;
    const req = https.request(
      {
        host,
        servername: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: { Host: url.hostname, Accept: "application/json" },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("OMDb request timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Fetch OMDb title by IMDb id (e.g. tt0816692).
 */
export async function fetchOmdbByImdbId(
  imdbId: string,
): Promise<OmdbResponse | null> {
  const key = process.env.OMDB_API_KEY?.trim();
  if (!key || !imdbId) return null;

  const id = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("i", id);
  url.searchParams.set("apikey", key);
  url.searchParams.set("plot", "short");

  try {
    const res = await httpsGet(url);
    if (res.status < 200 || res.status >= 300) return null;
    const data = JSON.parse(res.body) as OmdbResponse;
    if (data.Response !== "True") return null;
    return data;
  } catch (error) {
    console.warn(
      "[omdb] fetch failed",
      imdbId,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Fallback title search when IMDb id is missing (less precise).
 */
export async function fetchOmdbByTitle(
  title: string,
  year?: string | null,
  type?: "movie" | "series",
): Promise<OmdbResponse | null> {
  const key = process.env.OMDB_API_KEY?.trim();
  if (!key || !title.trim()) return null;

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("t", title.trim());
  url.searchParams.set("apikey", key);
  if (year) url.searchParams.set("y", year.slice(0, 4));
  if (type) url.searchParams.set("type", type);

  try {
    const res = await httpsGet(url);
    if (res.status < 200 || res.status >= 300) return null;
    const data = JSON.parse(res.body) as OmdbResponse;
    if (data.Response !== "True") return null;
    return data;
  } catch (error) {
    console.warn(
      "[omdb] title search failed",
      title,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
