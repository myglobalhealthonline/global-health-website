"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_AUTH_COOKIE_NAME, adminAuthCookieOptions } from "@/lib/auth/admin-session-cookie";
import { loginAdminWithBackend, notifyAdminLogout } from "@/lib/server/admin-auth-api";

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().startsWith("/").optional().default("/admin"),
});

export type LoginActionResult = { ok: true } | { ok: false; message: string };

export async function signInAction(formData: FormData): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || "/admin",
  });
  if (!parsed.success) {
    return { ok: false, message: "Invalid email or password" };
  }

  const email = parsed.data.email.toLowerCase();
  const result = await loginAdminWithBackend({
    email,
    password: parsed.data.password,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const jar = await cookies();
  jar.set(ADMIN_AUTH_COOKIE_NAME, result.token, adminAuthCookieOptions());

  redirect(parsed.data.next);
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  if (token) {
    await notifyAdminLogout(token);
  }
  jar.delete(ADMIN_AUTH_COOKIE_NAME);
  redirect("/admin/login");
}
