"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validations/profile";
import { updateProfile } from "@/features/profile/actions/profile-actions";
import type { Profile } from "@/types";

interface ProfileFormProps {
  profile: Profile;
}

/**
 * Profile management scaffold — edit display fields only (no avatar upload yet).
 */
export function ProfileForm({ profile }: ProfileFormProps) {
  const [pending, startTransition] = React.useTransition();

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: profile.username ?? "",
      displayName: profile.display_name ?? "",
      bio: profile.bio ?? "",
      website: profile.website ?? "",
      isPublic: profile.is_public,
    },
  });

  function onSubmit(values: ProfileUpdateInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", values.username);
      formData.set("displayName", values.displayName);
      formData.set("bio", values.bio ?? "");
      formData.set("website", values.website ?? "");
      formData.set("isPublic", String(values.isPublic));

      const result = await updateProfile(null, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input disabled={pending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input disabled={pending} {...field} />
              </FormControl>
              <FormDescription>Letters, numbers, and underscores only.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  disabled={pending}
                  placeholder="A short note about your taste in film…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://"
                  disabled={pending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Public profile</FormLabel>
                <FormDescription>
                  When enabled, others can view your profile. Social features arrive later.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={pending}
                  aria-label="Public profile"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          Save changes
        </Button>
      </form>
    </Form>
  );
}
