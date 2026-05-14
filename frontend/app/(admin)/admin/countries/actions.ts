"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "backend/types";
import { z } from "zod";
import { prisma } from "backend";
import { writeAudit } from "backend/audit/log";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { fail, fieldErrorsFromZod, type ActionResult } from "@/lib/admin/action-result";
import { SLUG_REGEX, slugify } from "@/lib/admin/slug";

const baseFields = {
  code: z.string().trim().min(2).max(4).regex(/^[A-Z]{2,4}$/, "Code must be uppercase letters"),
  slug: z.string().trim().min(2).max(8).regex(SLUG_REGEX, "Lowercase letters, digits and hyphens only"),
  name: z.string().trim().min(1).max(80),
  currency: z.string().trim().min(2).max(8),
  currencySymbol: z.string().trim().max(8).optional().or(z.literal("")).transform((v) => v || null),
  languages: z.string().trim().max(400).transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  ),
  phone: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || null),
  email: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || null),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || null),
  heroTitle: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || null),
  heroSubtitle: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => v || null),
  ctaLabel: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => v || null),
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
};

const createSchema = z.object(baseFields);
const updateSchema = z.object({ id: z.string().min(1), ...baseFields });

function readForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCountryAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = createSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return fail("Please review the form fields.", fieldErrorsFromZod(parsed.error));
  }
  const data = parsed.data;
  const publish = formData.get("intent") === "publish";

  try {
    const created = await prisma.country.create({
      data: {
        ...data,
        status: publish ? "PUBLISHED" : "DRAFT",
      },
      select: { id: true, slug: true },
    });
    await writeAudit({
      userId: user.id,
      action: "country.create",
      entity: "Country",
      entityId: created.id,
      metadata: { slug: created.slug, published: publish },
    });
    revalidatePath("/admin/countries");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A country with that code or slug already exists.");
    }
    throw err;
  }
  redirect("/admin/countries");
}

export async function updateCountryAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = updateSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return fail("Please review the form fields.", fieldErrorsFromZod(parsed.error));
  }
  const { id, ...data } = parsed.data;
  const intent = formData.get("intent");

  try {
    const updated = await prisma.country.update({
      where: { id },
      data: {
        ...data,
        ...(intent === "publish" ? { status: "PUBLISHED" } : {}),
        ...(intent === "draft" ? { status: "DRAFT" } : {}),
      },
      select: { id: true, slug: true, status: true },
    });
    await writeAudit({
      userId: user.id,
      action: "country.update",
      entity: "Country",
      entityId: updated.id,
      metadata: { slug: updated.slug, status: updated.status, intent: String(intent ?? "save") },
    });
    revalidatePath("/admin/countries");
    revalidatePath(`/admin/countries/${id}`);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A country with that code or slug already exists.");
    }
    throw err;
  }
  redirect(`/admin/countries/${id}`);
}

export async function toggleCountryActiveAction(formData: FormData): Promise<void> {
  const user = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("active") === "true";
  if (!id) return;
  const updated = await prisma.country.update({
    where: { id },
    data: { active: next },
    select: { id: true, active: true, slug: true },
  });
  await writeAudit({
    userId: user.id,
    action: next ? "country.activate" : "country.deactivate",
    entity: "Country",
    entityId: updated.id,
    metadata: { slug: updated.slug, active: updated.active },
  });
  revalidatePath("/admin/countries");
}

export async function slugifyHelper(value: string) {
  "use server";
  return slugify(value);
}
