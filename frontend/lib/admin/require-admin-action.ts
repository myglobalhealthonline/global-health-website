import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";

/**
 * Authorization guard for admin Server Actions.
 *
 * Next.js Server Actions are public HTTP endpoints — the admin layout's
 * render-time role check does NOT protect an action invocation. Call this
 * first in every mutating admin action so a logged-out or non-admin caller
 * who POSTs the action endpoint directly is rejected, instead of relying
 * solely on the backend rejecting the forwarded cookie.
 *
 * Redirects to login on failure (Server Actions can't return a 401 body
 * the way a route handler can).
 */
export async function requireAdminAction(): Promise<void> {
  const user = await getServerAuthUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?next=/admin");
  }
}
