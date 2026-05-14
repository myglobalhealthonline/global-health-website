"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "backend/types";
import { z } from "zod";
import { prisma } from "backend";
import { writeAudit } from "backend/audit/log";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { fail, fieldErrorsFromZod, type ActionResult } from "@/lib/admin/action-result";

const inviteSchema = z.object({
  email: z.string().trim().email().max(200).transform((v) => v.toLowerCase()),
  name: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || null),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
  password: z.string().min(12, "Password must be at least 12 characters").max(200),
});

const roleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
});

export async function inviteUserAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please review the fields.", fieldErrorsFromZod(parsed.error));
  }
  const { email, name, role, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const created = await prisma.user.create({
      data: { email, name, role, passwordHash },
      select: { id: true, email: true, role: true },
    });
    await writeAudit({
      userId: actor.id,
      action: "user.invite",
      entity: "User",
      entityId: created.id,
      metadata: { email: created.email, role: created.role },
    });
    revalidatePath("/admin/users");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A user with that email already exists.");
    }
    throw err;
  }
  redirect("/admin/users");
}

export async function changeUserRoleAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();
  const parsed = roleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  if (parsed.data.id === actor.id) return; // never demote yourself

  const updated = await prisma.user.update({
    where: { id: parsed.data.id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true },
  });
  await writeAudit({
    userId: actor.id,
    action: "user.role.change",
    entity: "User",
    entityId: updated.id,
    metadata: { email: updated.email, role: updated.role },
  });
  revalidatePath("/admin/users");
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id || id === actor.id) return;

  const updated = await prisma.user.update({
    where: { id },
    data: { active },
    select: { id: true, email: true, active: true },
  });
  await writeAudit({
    userId: actor.id,
    action: active ? "user.activate" : "user.deactivate",
    entity: "User",
    entityId: updated.id,
    metadata: { email: updated.email, active: updated.active },
  });
  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(formData: FormData): Promise<ActionResult<{ password: string }>> {
  const actor = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing user id.");
  // v1 reset = generate a one-time password the super admin reveals to the user
  const password = generateTempPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await prisma.user.update({
    where: { id },
    data: { passwordHash },
    select: { id: true, email: true },
  });
  await writeAudit({
    userId: actor.id,
    action: "user.password.reset",
    entity: "User",
    entityId: updated.id,
    metadata: { email: updated.email },
  });
  revalidatePath("/admin/users");
  return { ok: true, data: { password } };
}

function generateTempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let out = "";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
