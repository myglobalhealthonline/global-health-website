import { prisma } from "../../db/prisma.js";
import { resolveOrCreatePatientProfile } from "../../routes/consents.route.js";

const SCOPE_TO_CONSENT_TYPE: Record<string, string> = {
  DIRECT: "MEDICAL_ACCESS_DIRECT",
  COUNTRY_CLINIC: "MEDICAL_ACCESS_COUNTRY_CLINIC",
  GLOBAL_NETWORK: "MEDICAL_ACCESS_GLOBAL_NETWORK",
};

/**
 * Promote booking-time medical-access consent captured on guest/patient
 * Appointment rows into the append-only PatientConsent ledger. Works for
 * both logged-in bookings (userId set) and guest bookings (userId null,
 * matched by email) — a guest promotion is a no-op if no PatientProfile
 * exists yet for that email (e.g. the payment path upserts one; the
 * booking-form path may not have one yet). Idempotent: skips any
 * appointment whose scope/cross-border choice already has a matching
 * source="BOOKING_FORM" row for that patient profile — safe to call
 * repeatedly (e.g. on every login, every payment webhook redelivery).
 *
 * Non-fatal by design — callers fire-and-forget this; a promotion miss
 * must never block login, email verification, or booking.
 */
export async function promoteAppointmentConsents(
  userId: string | null,
  email: string,
): Promise<void> {
  const appointments = await prisma.appointment.findMany({
    where: {
      ...(userId ? { userId } : { email: { equals: email, mode: "insensitive" }, userId: null }),
      OR: [
        { medicalAccessConsentScope: { not: null } },
        { crossBorderConsentAccepted: true },
      ],
    },
    select: {
      id: true,
      medicalAccessConsentScope: true,
      crossBorderConsentAccepted: true,
      createdAt: true,
    },
  });
  if (appointments.length === 0) return;

  let profile: { id: string; globalHealthNumber: string | null } | null;
  if (userId) {
    profile = await resolveOrCreatePatientProfile(userId, email);
  } else {
    profile = await prisma.patientProfile.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, globalHealthNumber: true },
    });
    if (!profile) return;
  }

  const alreadyPromoted = await prisma.patientConsent.findMany({
    where: {
      patientProfileId: profile.id,
      source: "BOOKING_FORM",
      consentType: { in: [...Object.values(SCOPE_TO_CONSENT_TYPE), "CROSS_BORDER_FILE_ACCESS"] },
    },
    select: { consentType: true },
  });
  const promotedTypes = new Set(alreadyPromoted.map((c) => c.consentType));

  const rows: {
    patientProfileId: string;
    globalHealthNumber: string | null;
    consentType: string;
    consentValue: boolean;
    source: string;
    changedByUserId: string | null;
    changedByRole: string;
  }[] = [];

  for (const appt of appointments) {
    const scopeType = appt.medicalAccessConsentScope
      ? SCOPE_TO_CONSENT_TYPE[appt.medicalAccessConsentScope]
      : null;
    if (scopeType && !promotedTypes.has(scopeType)) {
      rows.push({
        patientProfileId: profile.id,
        globalHealthNumber: profile.globalHealthNumber ?? null,
        consentType: scopeType,
        consentValue: true,
        source: "BOOKING_FORM",
        changedByUserId: userId,
        changedByRole: "PATIENT",
      });
      promotedTypes.add(scopeType);
    }
    if (appt.crossBorderConsentAccepted && !promotedTypes.has("CROSS_BORDER_FILE_ACCESS")) {
      rows.push({
        patientProfileId: profile.id,
        globalHealthNumber: profile.globalHealthNumber ?? null,
        consentType: "CROSS_BORDER_FILE_ACCESS",
        consentValue: true,
        source: "BOOKING_FORM",
        changedByUserId: userId,
        changedByRole: "PATIENT",
      });
      promotedTypes.add("CROSS_BORDER_FILE_ACCESS");
    }
  }

  if (rows.length === 0) return;
  await prisma.patientConsent.createMany({ data: rows });
}
