"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Spinner } from "@/components/feedback/page-loader";
import {
  settingsUpdateSchema,
  type SettingsUpdateInput,
} from "@/lib/validations/settings";
import { updateSettings } from "@/features/settings/actions/settings-actions";
import type { UserSettings } from "@/types";

interface SettingsFormProps {
  settings: UserSettings;
}

/**
 * Settings — density, notifications, accessibility (dark theme is fixed).
 */
export function SettingsForm({ settings }: SettingsFormProps) {
  const [pending, startTransition] = React.useTransition();

  const form = useForm<SettingsUpdateInput>({
    resolver: zodResolver(settingsUpdateSchema),
    defaultValues: {
      theme: "dark",
      density: settings.density,
      language: settings.language,
      emailNotifications: settings.email_notifications,
      marketingEmails: settings.marketing_emails,
      reducedMotion: settings.reduced_motion,
    },
  });

  function onSubmit(values: SettingsUpdateInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("theme", "dark");
      formData.set("density", values.density);
      formData.set("language", values.language);
      formData.set("emailNotifications", String(values.emailNotifications));
      formData.set("marketingEmails", String(values.marketingEmails));
      formData.set("reducedMotion", String(values.reducedMotion));

      const result = await updateSettings(null, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Argus uses a dark cinematic theme. Adjust density and motion preferences below.
            </p>
          </div>
          <FormField
            control={form.control}
            name="density"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Density</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={pending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select density" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Comfortable for large posters; compact for denser grids.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Choose what we can email you about.
            </p>
          </div>
          <FormField
            control={form.control}
            name="emailNotifications"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="space-y-0.5 pr-4">
                  <FormLabel>Product emails</FormLabel>
                  <FormDescription>
                    Account security and important product updates.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={pending}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="marketingEmails"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="space-y-0.5 pr-4">
                  <FormLabel>Marketing emails</FormLabel>
                  <FormDescription>Occasional news and feature highlights.</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={pending}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Accessibility</h2>
            <p className="text-sm text-muted-foreground">
              Preferences that improve comfort and readability.
            </p>
          </div>
          <FormField
            control={form.control}
            name="reducedMotion"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="space-y-0.5 pr-4">
                  <FormLabel>Reduce motion</FormLabel>
                  <FormDescription>
                    Prefer fewer animations. Also respects system reduced-motion.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={pending}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={pending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  More locales will be added as localization expands.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          Save settings
        </Button>
      </form>
    </Form>
  );
}
