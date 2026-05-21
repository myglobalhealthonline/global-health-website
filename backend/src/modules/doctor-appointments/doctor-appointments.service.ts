import { prisma } from "../../db/prisma.js";
import { createReviewInviteForAppointment } from "../review-invites/review-invite.service.js";
import { sendBrazilFinalizationEmail } from "../../lib/email/templates.js";

export async function finalizeDoctorAppointment(
  doctorId: string,
  appointmentId: string,
  flags: { notesUploaded: boolean; filesUploaded: boolean },
) {
  if (!flags.notesUploaded || !flags.filesUploaded) {
    throw new Error("Both notes and files must be marked as uploaded before finalizing");
  }
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: {
      id: true,
      countryCode: true,
      fullName: true,
      email: true,
      status: true,
      finalized: true,
    },
  });
  if (!appt) return null;
  if (appt.finalized) {
    throw new Error("Appointment is already finalized");
  }

  const now = new Date();
  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      finalized: true,
      notesUploaded: true,
      filesUploaded: true,
      status: "COMPLETED",
      consultationCompletedAt: now,
    },
    select: {
      id: true,
      status: true,
      finalized: true,
      notesUploaded: true,
      filesUploaded: true,
      consultationCompletedAt: true,
      countryCode: true,
      fullName: true,
      email: true,
    },
  });

  createReviewInviteForAppointment(updated.id).catch(() => {});

  if (updated.countryCode.toLowerCase() === "br") {
    sendBrazilFinalizationEmail({
      to: updated.email,
      patientName: updated.fullName,
      appointmentId: updated.id,
    }).catch(() => {});
  }

  return updated;
}
