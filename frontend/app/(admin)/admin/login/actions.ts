"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "backend";
import {
  AUTH_COOKIE_NAME,
  cookieOptions,
  signAdminSession,
  verifyAdminSession,
} from "backend/auth/session";
import { writeAudit } from "backend/audit/log";

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
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      active: true,
    },
  });
  if (!user || !user.active) {
    return { ok: false, message: "Invalid email or password" };
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return { ok: false, message: "Account is not authorised for the admin area" };
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { ok: false, message: "Invalid email or password" };
  }

  const token = await signAdminSession({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, token, cookieOptions());

  await writeAudit({
    userId: user.id,
    action: "auth.login",
    entity: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  redirect(parsed.data.next);
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyAdminSession(token);
    if (payload) {
      await writeAudit({
        userId: payload.sub,
        action: "auth.logout",
        entity: "User",
        entityId: payload.sub,
        metadata: { email: payload.email },
      });
    }
  }
  jar.delete(AUTH_COOKIE_NAME);
  redirect("/admin/login");
}
