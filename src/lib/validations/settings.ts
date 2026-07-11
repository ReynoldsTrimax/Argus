import { z } from "zod";

/**
 * User settings schema for the settings page scaffold.
 */
export const settingsUpdateSchema = z.object({
  /** Always system — light/dark follow the OS; no manual app control. */
  theme: z.literal("system"),
  density: z.enum(["comfortable", "compact"]),
  language: z.string().min(2).max(10),
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  reducedMotion: z.boolean(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
