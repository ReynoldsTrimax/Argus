import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          Start building your personal cinema universe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
