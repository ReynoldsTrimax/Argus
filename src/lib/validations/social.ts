import { z } from "zod";

/** Matches the `profiles_username_format` / length constraints in migration 001. */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores");

export const friendSearchSchema = z.object({
  q: z.string().trim().min(2, "Type at least 2 characters").max(64),
});

export const userIdSchema = z.string().uuid("Invalid user");
export const friendshipIdSchema = z.string().uuid("Invalid request");

export const libraryVisibilitySchema = z.enum(["private", "friends", "public"]);

export type FriendSearchInput = z.infer<typeof friendSearchSchema>;
