"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "backend";
import { writeAudit } from "backend/audit/log";
import {
  assertValidStatusTransition,
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "backend/appointments/status-transitions";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { fail, type ActionResult } from "@/lib/admin/action-result";

const statusSchema = z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]);

export async function updateAppointmentStatusAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const status = statusSchema.safeParse(formData.get("status"));
  if (!id || !status.success) return fail("Invalid request.");

  const current = await prisma.appointment.findUnique({ where: { id }, select: { status: true, countryId: true } });
  if (!current) return fail("Appointment not found.");

  try {
    assertValidStatusTransition(current.status, status.data);
  } catch (err) {
    if (err instanceof InvalidAppointmentStatusTransitionError || err instanceof UnrecognizedAppointmentStatusError) {
      return fail(err.message);
    }
    throw err;
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: status.data },
  });
  await writeAudit({
    userId: user.id,
    action: `appointment.status.${status.data.toLowerCase()}`,
    entity: "Appointment",
    entityId: id,
    countryId: current.countryId,
    metadata: { from: current.status, to: status.data },
  });
  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${id}`);
  return { ok: true };
}
