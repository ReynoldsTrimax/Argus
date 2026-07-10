import { z } from "zod";

/**
 * Profile update schema for the profile management scaffold.
 */
export const profileUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Display name must be at most 50 characters"),
  bio: z.string().trim().max(500, "Bio must be at most 500 characters").optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  isPublic: z.boolean(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
