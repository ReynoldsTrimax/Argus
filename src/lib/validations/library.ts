import { z } from "zod";

export const mediaIdentitySchema = z.object({
  provider: z.string().default("tmdb"),
  mediaType: z.enum(["movie", "tv"]),
  externalId: z.string().min(1),
  title: z.string().min(1),
  originalTitle: z.string().nullable().optional(),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  runtimeMinutes: z.number().nullable().optional(),
  totalEpisodes: z.number().nullable().optional(),
  genres: z.array(z.string()).optional(),
  originalLanguage: z.string().nullable().optional(),
});

export const statusSchema = z.enum([
  "watching",
  "completed",
  "paused",
  "dropped",
  "wishlist",
  "plan_to_watch",
  "rewatching",
  "archived",
]);

export const ratingSchema = z.object({
  value: z.number().min(0).max(100),
  scale: z.enum(["five", "ten", "hundred"]).default("ten"),
});

export const reviewSchema = z.object({
  body: z.string().min(1).max(20000),
  containsSpoilers: z.boolean().default(false),
  visibility: z.enum(["private", "friends", "public"]).default("private"),
});

export const noteSchema = z.object({
  body: z.string().min(1).max(10000),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().nullable().optional(),
});

export const collectionSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
});

export const sessionSchema = z.object({
  sessionDate: z.string().optional(),
  durationMinutes: z.number().int().min(0).nullable().optional(),
  isRewatch: z.boolean().optional(),
  seasonNumber: z.number().int().nullable().optional(),
  episodeNumber: z.number().int().nullable().optional(),
  device: z.string().max(80).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
