import { z } from "zod";

/**
 * User settings schema for the settings page scaffold.
 */
export const settingsUpdateSchema = z.object({
  /** Product is dark-only. */
  theme: z.literal("dark"),
  density: z.enum(["comfortable", "compact"]),
  language: z.string().min(2).max(10),
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  reducedMotion: z.boolean(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
