import type { Metadata } from "next";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Argus",
};

export default function LoginPage() {
  return (
    <Card className="shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue to your entertainment hub.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<AuthFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function AuthFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
