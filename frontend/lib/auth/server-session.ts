import "server-only";

import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE_NAME } from "@/lib/auth/admin-session-cookie";
import { getAdminSessionFromBackend, type AdminUser } from "@/lib/server/admin-auth-api";

export type { AdminUser } from "@/lib/server/admin-auth-api";

/**
 * Reads the admin session cookie, verifies the JWT, and loads the user from the DB.
 * Returns null when the cookie is missing/invalid, the user doesn't exist, the user
 * is inactive, or the role is not an admin role.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return getAdminSessionFromBackend(token);
}
