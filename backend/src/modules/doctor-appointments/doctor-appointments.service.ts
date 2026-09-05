import { prisma } from "../../db/prisma.js";
import { createReviewInviteForAppointment } from "../review-invites/review-invite.service.js";
import { sendBrazilFinalizationEmail } from "../../lib/email/templates.js";
import {
  InvalidAppointmentStatusTransitionError,
  assertValidStatusTransition,
} from "../appointments/appointment-status-transitions.js";
import type { AppointmentStatus } from "../../validations/admin-appointments.schema.js";

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

  // The status was read and then ignored: a CANCELLED consultation could be
  // flipped to COMPLETED, which counts toward payout, fires a review invite
  // and an email, and — because `doctorHasTreatmentRelationship` excludes
  // only CANCELLED — hands the doctor PHI access back. Same "is this still
  // live" probe the patient cancel/reschedule paths use: terminal statuses
  // have no outgoing transitions, so probing against CANCELLED answers it
  // without inventing a second matrix. Deliberately a liveness check only —
  // it does not enforce ordered progression through CONTACTED, because every
  // appointment is created REQUEST_RECEIVED and nothing auto-sets CONTACTED.
  assertValidStatusTransition(appt.status as AppointmentStatus, "CANCELLED");

  const now = new Date();
  // Compare-and-swap on the status we just validated. A cancellation landing
  // between the read and this write moves the status, so the update matches
  // zero rows and the finalisation is rejected instead of overwriting it.
  const claimed = await prisma.appointment.updateMany({
    where: { id: appt.id, doctorId, finalized: false, status: appt.status },
    data: {
      finalized: true,
      notesUploaded: true,
      filesUploaded: true,
      status: "COMPLETED",
      consultationCompletedAt: now,
    },
  });
  if (claimed.count === 0) {
    // Lost the race — the row is no longer the one we validated. Surfaced,
    // never swallowed: the caller must not run the completion tail.
    throw new InvalidAppointmentStatusTransitionError(appt.status, "COMPLETED");
  }

  const updated = {
    id: appt.id,
    status: "COMPLETED" as const,
    finalized: true,
    notesUploaded: true,
    filesUploaded: true,
    consultationCompletedAt: now,
    countryCode: appt.countryCode,
    fullName: appt.fullName,
    email: appt.email,
  };

  createReviewInviteForAppointment(updated.id).catch((error) => {
    console.error("[review-invite] could not create post-consultation invite", {
      appointmentId: updated.id,
      error,
    });
  });

  if (updated.countryCode.toLowerCase() === "br") {
    sendBrazilFinalizationEmail({
      to: updated.email,
      patientName: updated.fullName,
      appointmentId: updated.id,
    }).catch(() => {});
  }

  return updated;
}
