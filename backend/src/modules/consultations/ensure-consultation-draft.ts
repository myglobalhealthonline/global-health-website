import { prisma } from "../../db/prisma.js";

/**
 * Ensures a draft Consultation row exists for an appointment so doctors can
 * issue prescriptions (and other consult-scoped actions) without visiting the
 * Consultation tab first.
 */
export async function ensureConsultationDraft(
  appointmentId: string,
  doctorId: string,
): Promise<{ id: string; status: string } | "not_found" | "signed"> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true },
  });
  if (!appt) return "not_found";

  const existing = await prisma.consultation.findUnique({
    where: { appointmentId: appt.id },
    select: { id: true, status: true },
  });
  if (existing?.status === "SIGNED") return "signed";

  const row = await prisma.consultation.upsert({
    where: { appointmentId: appt.id },
    create: { appointmentId: appt.id, doctorId },
    update: {},
    select: { id: true, status: true },
  });
  return row;
}
