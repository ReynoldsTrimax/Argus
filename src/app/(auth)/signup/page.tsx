import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Argus account",
};

export default function SignupPage() {
  return (
    <Card className="shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Set it up once, then everything you watch lives here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SignupForm />

        {/* The Terms treat account creation as acceptance, so it is stated here. */}
        <p className="text-muted-foreground text-xs leading-relaxed">
          By creating an account you agree to our{" "}
          <Link
            href={ROUTES.terms}
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href={ROUTES.privacy}
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
