"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Spinner } from "@/components/feedback/page-loader";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { ROUTES } from "@/constants/routes";
import { signUpWithPassword, signInWithOAuth } from "@/features/auth/actions/auth-actions";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";

/**
 * Registration form with OAuth options.
 */
export function SignupForm() {
  const [pending, startTransition] = React.useTransition();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
    },
  });

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);
      formData.set("confirmPassword", values.confirmPassword);
      formData.set("displayName", values.displayName);

      const result = await signUpWithPassword(null, formData);
      if (result && !result.success) {
        toast.error(result.error);
      }
    });
  }

  async function handleOAuth(provider: "google" | "github") {
    const result = await signInWithOAuth(provider);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    window.location.href = result.data.url;
  }

  return (
    <div className="space-y-6">
      <OAuthButtons onOAuth={handleOAuth} disabled={pending} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    placeholder="Alex Rivera"
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    disabled={pending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Spinner /> : null}
            Create account
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
