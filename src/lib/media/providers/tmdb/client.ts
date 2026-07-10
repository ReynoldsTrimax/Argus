/**
 * Low-level TMDB HTTP client.
 *
 * Uses public DNS (8.8.8.8 / 1.1.1.1) when resolving api.themoviedb.org because
 * some ISP resolvers return non-routable or black-hole IPs that cause
 * ConnectTimeoutError and empty catalog UIs.
 */

import { Resolver } from "node:dns/promises";
import https from "node:https";
import { URL } from "node:url";

const TMDB_BASE = "https://api.themoviedb.org/3";
const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1", "9.9.9.9"];
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 3;

export class TmdbError extends Error {
  constructor(
    message: string,
    public status: number,
    public path: string,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

export interface TmdbClientOptions {
  apiKey?: string;
  accessToken?: string;
  /** Default revalidate seconds for fetch cache (kept for API compatibility). */
  revalidate?: number;
}

function resolveCredentials(): { apiKey?: string; accessToken?: string } {
  return {
    apiKey: process.env.TMDB_API_KEY,
    accessToken: process.env.TMDB_READ_ACCESS_TOKEN,
  };
}

export function isTmdbConfigured(): boolean {
  const { apiKey, accessToken } = resolveCredentials();
  return Boolean(apiKey || accessToken);
}

const publicResolver = new Resolver();
publicResolver.setServers(PUBLIC_DNS_SERVERS);

type IpCacheEntry = { ips: string[]; expiresAt: number };
const ipCache = new Map<string, IpCacheEntry>();
const IP_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveIpv4(hostname: string): Promise<string[]> {
  const cached = ipCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ips;
  }

  try {
    const ips = await publicResolver.resolve4(hostname);
    if (ips.length > 0) {
      ipCache.set(hostname, { ips, expiresAt: Date.now() + IP_CACHE_TTL_MS });
      return ips;
    }
  } catch (error) {
    console.warn(
      `[tmdb] public DNS resolve failed for ${hostname}:`,
      error instanceof Error ? error.message : error,
    );
  }

  return [];
}

interface RawHttpResponse {
  status: number;
  statusText: string;
  body: string;
}

function requestOnce(
  url: URL,
  headers: Record<string, string>,
  address: string | null,
): Promise<RawHttpResponse> {
  const hostname = url.hostname;
  const connectHost = address ?? hostname;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: connectHost,
        servername: hostname,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          ...headers,
          Host: hostname,
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(
        new Error(
          `TMDB connect/read timed out after ${REQUEST_TIMEOUT_MS}ms (${connectHost})`,
        ),
      );
    });
    req.on("error", reject);
    req.end();
  });
}

async function resilientGet(
  url: URL,
  headers: Record<string, string>,
): Promise<RawHttpResponse> {
  const ips = await resolveIpv4(url.hostname);
  const targets: Array<string | null> =
    ips.length > 0 ? ips.slice(0, 3) : [null];

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const address = targets[attempt % targets.length] ?? null;
    try {
      return await requestOnce(url, headers, address);
    } catch (error) {
      lastError = error;
      // brief backoff before next IP / attempt
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "TMDB request failed after retries";
  throw new TmdbError(message, 0, url.pathname);
}

/**
 * GET a TMDB v3 endpoint. Returns null on 404; throws on other errors.
 */
export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: TmdbClientOptions = {},
): Promise<T | null> {
  const { apiKey, accessToken } = {
    ...resolveCredentials(),
    ...options,
  };

  if (!apiKey && !accessToken) {
    throw new TmdbError(
      "TMDB is not configured. Set TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN.",
      0,
      path,
    );
  }

  const url = new URL(`${TMDB_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  if (apiKey && !accessToken) {
    url.searchParams.set("api_key", apiKey);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await resilientGet(url, headers);

  if (response.status === 404) {
    return null;
  }

  if (response.status < 200 || response.status >= 300) {
    throw new TmdbError(
      `TMDB ${response.status}: ${response.body.slice(0, 200) || response.statusText}`,
      response.status,
      path,
    );
  }

  try {
    return JSON.parse(response.body) as T;
  } catch {
    throw new TmdbError("TMDB returned invalid JSON", response.status, path);
  }
}
