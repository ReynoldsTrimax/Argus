import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ROUTES } from "@/constants/routes";
import { getSessionContext } from "@/lib/services/user-service";

/**
 * Authenticated app layout. Middleware already guards routes; this is a
 * secondary server-side check and loads profile data for the shell.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let context: Awaited<ReturnType<typeof getSessionContext>>;

  try {
    context = await getSessionContext();
  } catch {
    redirect(ROUTES.login);
  }

  if (!context.user) {
    redirect(ROUTES.login);
  }

  const user = {
    email: context.user.email,
    displayName: context.profile?.display_name ?? context.user.user_metadata?.full_name,
    username: context.profile?.username,
    avatarUrl:
      context.profile?.avatar_url ??
      (context.user.user_metadata?.avatar_url as string | undefined),
  };

  return <AppShell user={user}>{children}</AppShell>;
}
