import "server-only";

import { redirect } from "next/navigation";
import { getAdminUser, type AdminUser } from "@/lib/auth/server-session";

export async function requireAdminUser(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user;
}

export async function requireSuperAdmin(): Promise<AdminUser> {
  const user = await requireAdminUser();
  if (user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }
  return user;
}
