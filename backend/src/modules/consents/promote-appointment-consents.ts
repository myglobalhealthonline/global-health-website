import { prisma } from "../../db/prisma.js";
import { resolveOrCreatePatientProfile } from "../../routes/consents.route.js";

const SCOPE_TO_CONSENT_TYPE: Record<string, string> = {
  DIRECT: "MEDICAL_ACCESS_DIRECT",
  COUNTRY_CLINIC: "MEDICAL_ACCESS_COUNTRY_CLINIC",
  GLOBAL_NETWORK: "MEDICAL_ACCESS_GLOBAL_NETWORK",
};

/**
 * Promote booking-time medical-access consent captured on guest/patient
 * Appointment rows into the append-only PatientConsent ledger, once the
 * booking is tied to a user account (guest claim on login/verify, or a
 * logged-in booking). Idempotent: skips any appointment whose scope/
 * cross-border choice already has a matching source="BOOKING_FORM" row for
 * that patient profile — safe to call repeatedly (e.g. on every login).
 *
 * Non-fatal by design — callers fire-and-forget this; a promotion miss
 * must never block login, email verification, or booking.
 */
export async function promoteAppointmentConsents(
  userId: string,
  email: string,
): Promise<void> {
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
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

  const profile = await resolveOrCreatePatientProfile(userId, email);

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
    changedByUserId: string;
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
