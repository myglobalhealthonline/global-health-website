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
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/login?next=/admin");
  }
}

/**
 * Stricter variant for money-mutation actions (e.g. subscription credit
 * adjustments) that must be SUPER_ADMIN-only. Deliberately separate from
 * `requireAdminAction` above — that one must stay ADMIN-accessible for the
 * rest of the admin surface. Redirects to /unauthorized (not /login) when
 * a real admin lacks the super tier, since they ARE authenticated — they
 * just lack this specific permission.
 */
export async function requireSuperAdminAction(): Promise<void> {
  const user = await getServerAuthUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (user.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }
}
