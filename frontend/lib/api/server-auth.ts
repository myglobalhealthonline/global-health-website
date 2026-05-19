import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { AuthUser } from "./auth-api";

/**
 * Resolve the current session user by calling the backend's
 * `/api/auth/me`. We forward the entire site cookie string so the
 * backend can pick out its own `gh_auth` cookie.
 *
 * Earlier this function had a "try site origin, then backend origin"
 * fallback ladder. That implicit contract (site cookie host vs.
 * backend cookie host must align) was a footgun — if someone set
 * `AUTH_COOKIE_DOMAIN` on the backend, the site-host fallback would
 * silently start returning null. The backend is the source of truth;
 * call it directly.
 */
export async function getServerAuthUser(): Promise<AuthUser | null> {
  const cookieHeader = (await cookies())
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  if (!cookieHeader) return null;

  const backend = getBackendOrigin();
  if (!backend) return null;

  try {
    const response = await fetch(`${backend}/api/auth/me`, {
      method: "GET",
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { user?: AuthUser };
    };
    if (!json.ok || !json.data?.user) return null;
    return json.data.user;
  } catch {
    return null;
  }
}
