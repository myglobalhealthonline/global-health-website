import { prisma } from "../../db/prisma.js";
import {
  createWidgetSession,
  isMemedPrescriptionConfigured,
  MemedPrescriptionNotConfiguredError,
  registerPrescriber,
} from "../../lib/memed/prescription-client.js";

/**
 * DB-aware orchestration around lib/memed/prescription-client.ts — the
 * client stays a pure API wrapper, this module owns the
 * DoctorCountry.memedPrescriberId cache and the BR/verified gating.
 *
 * BR-only in practice (Memed is a Brazilian platform), but scoped by the
 * appointment's own countryCode rather than hardcoded — any future BR
 * doctor gets this automatically, not just the doctor this shipped for.
 */

export class DoctorNotVerifiedForMemedError extends Error {
  constructor() {
    super("Doctor's CRM registration for this country is not verified yet");
    this.name = "DoctorNotVerifiedForMemedError";
  }
}

export class DoctorRegistrationMissingError extends Error {
  constructor() {
    super("Doctor has no CRM registration on file for this country");
    this.name = "DoctorRegistrationMissingError";
  }
}

async function loadDoctorCountryRow(doctorId: string, countryCode: string) {
  return prisma.doctorCountry.findFirst({
    where: { doctorId, country: { code: { equals: countryCode, mode: "insensitive" } } },
    select: {
      id: true,
      chamberEntity: true,
      registrationNumber: true,
      isVerified: true,
      memedPrescriberId: true,
    },
  });
}

/**
 * Look up (or register + cache) this doctor's Memed prescriber id for the
 * appointment's country. Throws if unconfigured, unregistered, or unverified
 * — all three are conditions the caller (route handler) turns into a clear
 * 4xx rather than a half-started widget session.
 */
export async function ensurePrescriber(doctorId: string, countryCode: string): Promise<string> {
  if (!isMemedPrescriptionConfigured()) throw new MemedPrescriptionNotConfiguredError();

  const row = await loadDoctorCountryRow(doctorId, countryCode);
  if (!row || !row.registrationNumber?.trim()) throw new DoctorRegistrationMissingError();
  if (!row.isVerified) throw new DoctorNotVerifiedForMemedError();
  if (row.memedPrescriberId) return row.memedPrescriberId;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { fullName: true } });
  const prescriberId = await registerPrescriber({
    doctorFullName: doctor?.fullName ?? "",
    crm: { chamberEntity: row.chamberEntity, registrationNumber: row.registrationNumber },
  });

  await prisma.doctorCountry.update({
    where: { id: row.id },
    data: { memedPrescriberId: prescriberId },
  });

  return prescriberId;
}

export async function startWidgetSession(input: {
  doctorId: string;
  appointmentId: string;
}): Promise<{ token: string; expiresAt: Date; scriptUrl: string | null }> {
  const appt = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, doctorId: input.doctorId },
    select: { id: true, fullName: true, email: true, countryCode: true },
  });
  if (!appt) throw new Error("Appointment not found");

  const prescriberId = await ensurePrescriber(input.doctorId, appt.countryCode);
  const session = await createWidgetSession({
    prescriberId,
    patientName: appt.fullName,
    patientExternalId: appt.email,
    appointmentId: appt.id,
  });

  const { env } = await import("../../config/env.js");
  return { token: session.token, expiresAt: session.expiresAt, scriptUrl: env.MEMED_PRESCRIPTION_SCRIPT_URL ?? null };
}
