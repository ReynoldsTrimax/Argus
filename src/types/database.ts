/**
 * Hand-authored database types for Phase 1 foundation tables.
 *
 * When the Supabase project is connected, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Extension points for later phases are documented below but intentionally omitted.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ThemePreference = "system" | "light" | "dark";
export type DensityPreference = "comfortable" | "compact";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          website: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          website?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          website?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: ThemePreference;
          density: DensityPreference;
          language: string;
          timezone: string | null;
          email_notifications: boolean;
          marketing_emails: boolean;
          reduced_motion: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: ThemePreference;
          density?: DensityPreference;
          language?: string;
          timezone?: string | null;
          email_notifications?: boolean;
          marketing_emails?: boolean;
          reduced_motion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: ThemePreference;
          density?: DensityPreference;
          language?: string;
          timezone?: string | null;
          email_notifications?: boolean;
          marketing_emails?: boolean;
          reduced_motion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          sidebar_collapsed: boolean;
          default_landing: string;
          content_languages: string[];
          spoiler_protection: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sidebar_collapsed?: boolean;
          default_landing?: string;
          content_languages?: string[];
          spoiler_protection?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sidebar_collapsed?: boolean;
          default_landing?: string;
          content_languages?: string[];
          spoiler_protection?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      theme_preference: ThemePreference;
      density_preference: DensityPreference;
    };
    CompositeTypes: Record<string, never>;
  };
}

/**
 * Future tables (not implemented in Phase 1):
 * - media_titles, media_types, genres, people, credits
 * - watch_entries, watch_status, watchlists, collections
 * - reviews, ratings, lists, list_items
 * - recommendations, analytics_events
 *
 * When adding them, extend `Database["public"]["Tables"]` and ship a migration.
 */

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type UserSettings = Tables<"user_settings">;
export type UserPreferences = Tables<"user_preferences">;
