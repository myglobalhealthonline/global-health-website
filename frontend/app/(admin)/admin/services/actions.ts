"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "backend/types";
import { z } from "zod";
import { prisma } from "backend";
import { writeAudit } from "backend/audit/log";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { fail, fieldErrorsFromZod, type ActionResult } from "@/lib/admin/action-result";
import { SLUG_REGEX } from "@/lib/admin/slug";

const baseFields = {
  slug: z.string().trim().min(2).max(160).regex(SLUG_REGEX),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(400),
  description: z.string().trim().max(20_000).optional().or(z.literal("")).transform((v) => v || ""),
  type: z.enum(["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST"]),
  countryId: z.string().min(1),
  categoryId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  priceCents: z
    .preprocess((v) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v) * 100)), z.number().int().min(0).max(10_000_000).nullable()),
  currency: z.string().trim().max(8).optional().or(z.literal("")).transform((v) => v || null),
  durationMin: z
    .preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().min(0).max(480).nullable()),
  imageUrl: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => v || null),
  metaTitle: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || null),
  metaDescription: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => v || null),
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  featured: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
};
const createSchema = z.object(baseFields);
const updateSchema = z.object({ id: z.string().min(1), ...baseFields });

function readForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createServiceAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = createSchema.safeParse(readForm(formData));
  if (!parsed.success) return fail("Please review the fields.", fieldErrorsFromZod(parsed.error));
  const data = parsed.data;
  const intent = formData.get("intent");

  try {
    const created = await prisma.service.create({
      data: {
        ...data,
        status: intent === "publish" ? "PUBLISHED" : "DRAFT",
      },
      select: { id: true, slug: true, countryId: true },
    });
    await writeAudit({
      userId: user.id,
      action: "service.create",
      entity: "Service",
      entityId: created.id,
      countryId: created.countryId,
      metadata: { slug: created.slug, type: data.type },
    });
    revalidatePath("/admin/services");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A service with that slug already exists in this country.");
    }
    throw err;
  }
  redirect("/admin/services");
}

export async function updateServiceAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = updateSchema.safeParse(readForm(formData));
  if (!parsed.success) return fail("Please review the fields.", fieldErrorsFromZod(parsed.error));
  const { id, ...data } = parsed.data;
  const intent = formData.get("intent");

  try {
    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...data,
        ...(intent === "publish" ? { status: "PUBLISHED" } : {}),
        ...(intent === "draft" ? { status: "DRAFT" } : {}),
      },
      select: { id: true, slug: true, countryId: true, status: true },
    });
    await writeAudit({
      userId: user.id,
      action: "service.update",
      entity: "Service",
      entityId: updated.id,
      countryId: updated.countryId,
      metadata: { slug: updated.slug, status: updated.status, intent: String(intent ?? "save") },
    });
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${id}`);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A service with that slug already exists in this country.");
    }
    throw err;
  }
  redirect(`/admin/services/${id}`);
}

export async function deleteServiceAction(formData: FormData): Promise<void> {
  const user = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const removed = await prisma.service.update({
    where: { id },
    data: { active: false },
    select: { id: true, countryId: true, slug: true },
  });
  await writeAudit({
    userId: user.id,
    action: "service.deactivate",
    entity: "Service",
    entityId: removed.id,
    countryId: removed.countryId,
    metadata: { slug: removed.slug },
  });
  revalidatePath("/admin/services");
  redirect("/admin/services");
}
