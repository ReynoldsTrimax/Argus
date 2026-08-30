import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { ShortcutsReference } from "@/features/settings/components/shortcuts-reference";
import { LocalPreferences } from "@/features/settings/components/local-preferences";
import { getSessionContext } from "@/lib/services/user-service";
import { ROUTES } from "@/constants/routes";
import type { UserSettings } from "@/types";

export const metadata: Metadata = {
  title: "Settings",
};

const DEFAULT_SETTINGS = (userId: string): UserSettings => ({
  id: "local-default",
  user_id: userId,
  theme: "system",
  density: "comfortable",
  language: "en",
  timezone: null,
  email_notifications: true,
  marketing_emails: false,
  reduced_motion: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

/**
 * Full settings experience — account, display, shortcuts, privacy hooks.
 */
export default async function SettingsPage() {
  const { user, settings } = await getSessionContext();
  if (!user) redirect(ROUTES.login);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Appearance, accessibility, keyboard shortcuts, and data controls.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account preferences</CardTitle>
          <CardDescription>
            Synced to your Supabase account when configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings ?? DEFAULT_SETTINGS(user.id)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This device</CardTitle>
          <CardDescription>Local-only display preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <LocalPreferences />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keyboard</CardTitle>
        </CardHeader>
        <CardContent>
          <ShortcutsReference />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy & data</CardTitle>
          <CardDescription>
            Export your journal data or review how Argus stores personal media.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Personal library, ratings, reviews, and notes live in your Supabase project
            under RLS. Catalog metadata comes from TMDB and is not stored as a full
            mirror.
          </p>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.library}>Open library</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.profile}>Edit profile</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.privacy}>Privacy Policy</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.terms}>Terms of Service</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Full JSON export via{" "}
            <code className="rounded bg-muted px-1">buildArgusExport</code> is scaffolded
            in <code className="rounded bg-muted px-1">features/import-export</code> for a
            future UI action.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
