import "server-only";

import { cookies } from "next/headers";
import { prisma } from "backend";
import { AUTH_COOKIE_NAME, verifyAdminSession } from "backend/auth/session";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
};

/**
 * Reads the admin session cookie, verifies the JWT, and loads the user from the DB.
 * Returns null when the cookie is missing/invalid, the user doesn't exist, the user
 * is inactive, or the role is not an admin role.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyAdminSession(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!user || !user.active) return null;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
