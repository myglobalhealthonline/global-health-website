import { prisma } from "../../db/prisma.js";
import { createReviewInviteForAppointment } from "../review-invites/review-invite.service.js";
import { sendBrazilFinalizationEmail } from "../../lib/email/templates.js";
import {
  InvalidAppointmentStatusTransitionError,
  assertKnownAppointmentStatus,
} from "../appointments/appointment-status-transitions.js";

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
  // only CANCELLED — hands the doctor PHI access back. So CANCELLED is the
  // one status that blocks finalisation, and an unrecognised stored status
  // still surfaces rather than being finalised blind.
  //
  // COMPLETED is explicitly NOT blocked while `finalized` is false. The
  // status dropdown on the doctor's own consultation page writes COMPLETED
  // ("Concluded") directly, with no transition matrix in front of it, so a
  // doctor who sets the status before pressing Finalize used to land in a
  // dead end: the row said COMPLETED, terminal, and every finalize attempt
  // 409'd forever — no `consultationCompletedAt`, no payout row, no review
  // invite, no Brazil email. Finalising a row that is already COMPLETED adds
  // none of the escalations WF-2 guards against; it only completes the work
  // the doctor already declared done. `finalized` above remains the
  // idempotency gate, so a genuine second finalize still 409s.
  assertKnownAppointmentStatus(appt.status);
  if (appt.status === "CANCELLED") {
    throw new InvalidAppointmentStatusTransitionError(appt.status, "COMPLETED");
  }

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
