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
  slug: z.string().trim().min(2).max(60).regex(SLUG_REGEX),
  name: z.string().trim().min(1).max(80),
  type: z.enum(["GENERAL", "SPECIALIST"]),
  description: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => v || null),
  iconUrl: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => v || null),
};
const createSchema = z.object(baseFields);
const updateSchema = z.object({ id: z.string().min(1), ...baseFields });

function readForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCategoryAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = createSchema.safeParse(readForm(formData));
  if (!parsed.success) return fail("Please review the fields.", fieldErrorsFromZod(parsed.error));

  try {
    const created = await prisma.category.create({ data: parsed.data, select: { id: true, slug: true } });
    await writeAudit({
      userId: user.id,
      action: "category.create",
      entity: "Category",
      entityId: created.id,
      metadata: { slug: created.slug },
    });
    revalidatePath("/admin/categories");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A category with that slug already exists.");
    }
    throw err;
  }
  redirect("/admin/categories");
}

export async function updateCategoryAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = updateSchema.safeParse(readForm(formData));
  if (!parsed.success) return fail("Please review the fields.", fieldErrorsFromZod(parsed.error));
  const { id, ...data } = parsed.data;

  try {
    const updated = await prisma.category.update({ where: { id }, data, select: { id: true, slug: true } });
    await writeAudit({
      userId: user.id,
      action: "category.update",
      entity: "Category",
      entityId: updated.id,
      metadata: { slug: updated.slug },
    });
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}`);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("Slug conflict — try a different value.");
    }
    throw err;
  }
  redirect(`/admin/categories/${id}`);
}

export async function toggleCategoryCountryAction(formData: FormData): Promise<void> {
  const user = await requireAdminUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const countryId = String(formData.get("countryId") ?? "");
  const enable = formData.get("enable") === "true";
  if (!categoryId || !countryId) return;

  if (enable) {
    await prisma.categoryCountry.upsert({
      where: { categoryId_countryId: { categoryId, countryId } },
      create: { categoryId, countryId, active: true },
      update: { active: true },
    });
  } else {
    await prisma.categoryCountry
      .delete({ where: { categoryId_countryId: { categoryId, countryId } } })
      .catch(() => undefined);
  }
  await writeAudit({
    userId: user.id,
    action: enable ? "category.enable" : "category.disable",
    entity: "CategoryCountry",
    entityId: categoryId,
    countryId,
    metadata: { enabled: enable },
  });
  revalidatePath("/admin/categories");
}
