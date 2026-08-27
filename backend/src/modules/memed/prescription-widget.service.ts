import { prisma } from "../../db/prisma.js";
import { decryptPhi } from "../../lib/crypto/phi-crypto.js";
import {
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
 *
 * `memedPrescriberId` now stores Memed's per-doctor AUTH TOKEN (their real
 * API returns a `token` on registration, not a separate opaque id — see
 * lib/memed/prescription-client.ts's doc comment). The column name is kept
 * from the earlier guess to avoid a second schema round on the same
 * feature; what it holds is the widget's `data-token` value directly.
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

export class DoctorCpfMissingError extends Error {
  constructor() {
    super("Doctor has no CPF on file for this country — required by Memed");
    this.name = "DoctorCpfMissingError";
  }
}

export class DoctorDateOfBirthMissingError extends Error {
  constructor() {
    super("Doctor has no date of birth on file — required by Memed");
    this.name = "DoctorDateOfBirthMissingError";
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
      cpfEncrypted: true,
      country: { select: { code: true } },
    },
  });
}

/** dd/mm/YYYY, per Memed's documented `data_nascimento` format. */
function formatDateBr(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Best-effort split — Memed wants `nome`/`sobrenome` separately, we only store a fullName. */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? fullName, lastName: parts.slice(1).join(" ") || parts[0] };
}

/**
 * Look up (or register + cache) this doctor's Memed prescriber token for
 * the appointment's country. Throws if unconfigured, unregistered CRM,
 * unverified, or missing CPF/DOB — all conditions the caller (route
 * handler) turns into a clear 4xx rather than a half-started widget
 * session.
 */
export async function ensurePrescriber(doctorId: string, countryCode: string): Promise<string> {
  if (!isMemedPrescriptionConfigured()) throw new MemedPrescriptionNotConfiguredError();

  const row = await loadDoctorCountryRow(doctorId, countryCode);
  if (!row || !row.registrationNumber?.trim()) throw new DoctorRegistrationMissingError();
  if (!row.isVerified) throw new DoctorNotVerifiedForMemedError();
  if (row.memedPrescriberId) return row.memedPrescriberId;
  if (!row.cpfEncrypted) throw new DoctorCpfMissingError();

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { fullName: true, whatsappNumber: true, dateOfBirth: true },
  });
  if (!doctor?.dateOfBirth) throw new DoctorDateOfBirthMissingError();

  const userLink = await prisma.user.findFirst({
    where: { doctorId, isActive: true },
    select: { email: true },
  });

  const { firstName, lastName } = splitName(doctor.fullName);
  const token = await registerPrescriber({
    externalId: row.id,
    firstName,
    lastName,
    cpf: decryptPhi(row.cpfEncrypted) ?? "",
    board: {
      boardCode: row.chamberEntity?.trim() || "CRM",
      boardNumber: row.registrationNumber,
      boardState: row.country.code.toUpperCase(),
    },
    dateOfBirthBr: formatDateBr(doctor.dateOfBirth),
    email: userLink?.email ?? "",
    phone: doctor.whatsappNumber ?? "",
  });

  await prisma.doctorCountry.update({
    where: { id: row.id },
    data: { memedPrescriberId: token },
  });

  return token;
}

export async function startWidgetSession(input: {
  doctorId: string;
  appointmentId: string;
}): Promise<{ token: string; scriptUrl: string | null }> {
  const appt = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, doctorId: input.doctorId },
    select: { id: true, countryCode: true },
  });
  if (!appt) throw new Error("Appointment not found");

  const token = await ensurePrescriber(input.doctorId, appt.countryCode);

  const { env } = await import("../../config/env.js");
  return { token, scriptUrl: env.MEMED_PRESCRIPTION_SCRIPT_URL ?? null };
}
