import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { resolvePatientProfileIdForAppointmentId } from "../patient-profile/appointment-patient-link.js";
import { requestVerification } from "./identity-verification.service.js";
import { notifyPatientVerificationRequested } from "./notify-identity-verification.service.js";

/**
 * Ask a patient to verify as soon as their booking is paid, rather than
 * waiting for a doctor to notice mid-consultation.
 *
 * The point is timing. Verification needs a human to review a photo, so a
 * request raised during the consultation is already too late to help that
 * consultation — the doctor ends up prescribing with no identity claim, or the
 * patient waits. Asking at booking gives the whole gap between booking and
 * appointment to get it done.
 *
 * Fire-and-forget and idempotent, like the other post-payment hooks: webhook
 * redelivery must be harmless, and nothing here may affect a paid order.
 */
export async function onAppointmentConfirmed(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, email: true, countryCode: true },
  });
  if (!appt?.email) return;

  // The patient behind THIS appointment, by the shared conservative rules —
  // the durable link, or a legacy row corroborated by account + address + no
  // booked-for-other order line. A `findFirst` on the appointment's address
  // used to stand in for that, which meant a released address handed this hook
  // whoever registered with it next: the request was stamped onto their chart
  // and the message went to them. Null (a dependent, a guest, an address with
  // more than one claimant) simply asks nobody.
  const patientProfileId = await resolvePatientProfileIdForAppointmentId(appt.id);
  if (!patientProfileId) return;

  const profile = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: { id: true, idVerificationStatus: true, idVerifyRequestedAt: true },
  });
  if (!profile) return;

  // Already sorted, or already asked. Re-asking on every booking would turn a
  // one-off request into a nag, and redelivered webhooks would each send one.
  if (profile.idVerificationStatus === "VERIFIED") return;
  if (profile.idVerifyRequestedAt) return;

  await requestVerification({
    patientProfileId: profile.id,
    // System-initiated: no doctor asked for this one.
    requestedByDoctorId: null,
  });

  await recordAudit({
    actorRole: "SYSTEM",
    action: "IDENTITY_VERIFICATION_REQUESTED",
    entityType: "PatientProfile",
    entityId: profile.id,
    metadata: { appointmentId: appt.id, trigger: "APPOINTMENT_CONFIRMED", countryCode: appt.countryCode },
  });

  await notifyPatientVerificationRequested({
    patientProfileId: profile.id,
    appointmentId: appt.id,
  });
}
