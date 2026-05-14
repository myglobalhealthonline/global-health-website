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
  slug: z.string().trim().min(2).max(120).regex(SLUG_REGEX),
  name: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(8000).optional().or(z.literal("")).transform((v) => v || ""),
  imageUrl: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => v || null),
  registrationNumber: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => v || null),
  yearsExperience: z
    .preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().min(0).max(80).nullable()),
  languages: z.string().trim().max(400).transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  ),
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
};

const createSchema = z.object(baseFields);
const updateSchema = z.object({ id: z.string().min(1), ...baseFields });

function readForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function parseCountryAssignments(formData: FormData): { countryId: string; sortOrder: number; active: boolean }[] {
  const ids = formData.getAll("countryAssignmentId").map(String);
  return ids
    .filter((id) => id)
    .map((id) => ({
      countryId: id,
      sortOrder: Number(formData.get(`countrySort-${id}`) ?? 0) || 0,
      active: formData.get(`countryActive-${id}`) === "on",
    }));
}

export async function createDoctorAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = createSchema.safeParse(readForm(formData));
  if (!parsed.success) return fail("Please review the fields.", fieldErrorsFromZod(parsed.error));

  const assignments = parseCountryAssignments(formData);
  try {
    const created = await prisma.doctor.create({
      data: {
        ...parsed.data,
        countryLinks: assignments.length
          ? {
              create: assignments.map((a) => ({
                countryId: a.countryId,
                sortOrder: a.sortOrder,
                active: a.active,
              })),
            }
          : undefined,
      },
      select: { id: true, slug: true },
    });
    await writeAudit({
      userId: user.id,
      action: "doctor.create",
      entity: "Doctor",
      entityId: created.id,
      metadata: { slug: created.slug, countries: assignments.map((a) => a.countryId) },
    });
    revalidatePath("/admin/doctors");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A doctor with that slug already exists.");
    }
    throw err;
  }
  redirect("/admin/doctors");
}

export async function updateDoctorAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const parsed = updateSchema.safeParse(readForm(formData));
  if (!parsed.success) return fail("Please review the fields.", fieldErrorsFromZod(parsed.error));
  const { id, ...data } = parsed.data;
  const assignments = parseCountryAssignments(formData);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.doctor.update({ where: { id }, data });
      const existing = await tx.doctorCountry.findMany({ where: { doctorId: id } });
      const desiredIds = new Set(assignments.map((a) => a.countryId));
      // Remove links no longer wanted
      for (const link of existing) {
        if (!desiredIds.has(link.countryId)) {
          await tx.doctorCountry.delete({ where: { id: link.id } });
        }
      }
      // Upsert wanted
      for (const a of assignments) {
        await tx.doctorCountry.upsert({
          where: { doctorId_countryId: { doctorId: id, countryId: a.countryId } },
          create: { doctorId: id, countryId: a.countryId, sortOrder: a.sortOrder, active: a.active },
          update: { sortOrder: a.sortOrder, active: a.active },
        });
      }
    });
    await writeAudit({
      userId: user.id,
      action: "doctor.update",
      entity: "Doctor",
      entityId: id,
      metadata: { countries: assignments.map((a) => a.countryId) },
    });
    revalidatePath("/admin/doctors");
    revalidatePath(`/admin/doctors/${id}`);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A doctor with that slug already exists.");
    }
    throw err;
  }
  redirect(`/admin/doctors/${id}`);
}

export async function deleteDoctorAction(formData: FormData): Promise<void> {
  const user = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.doctor.update({ where: { id }, data: { active: false } });
  await writeAudit({
    userId: user.id,
    action: "doctor.deactivate",
    entity: "Doctor",
    entityId: id,
  });
  revalidatePath("/admin/doctors");
  redirect("/admin/doctors");
}
