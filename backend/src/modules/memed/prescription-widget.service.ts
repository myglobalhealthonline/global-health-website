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

export class DoctorMemedNotEnabledError extends Error {
  constructor() {
    super("This doctor is not enabled for Memed e-prescription signing");
    this.name = "DoctorMemedNotEnabledError";
  }
}

export class DoctorBoardStateMissingError extends Error {
  constructor() {
    super("Doctor's CRM state (UF) is not on file — required by Memed");
    this.name = "DoctorBoardStateMissingError";
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
      memedPrescriptionEnabled: true,
      boardState: true,
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
  // Checked every call, even for an already-registered doctor — an admin
  // switching this off must block future sessions immediately, not just
  // stop new registrations.
  if (!row.memedPrescriptionEnabled) throw new DoctorMemedNotEnabledError();
  if (row.memedPrescriberId) return row.memedPrescriberId;
  if (!row.cpfEncrypted) throw new DoctorCpfMissingError();
  if (!row.boardState?.trim()) throw new DoctorBoardStateMissingError();

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
      boardState: row.boardState.trim().toUpperCase(),
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

export type MemedPatient = {
  idExterno: string;
  nome: string;
  cpf?: string;
  passaporte?: string;
  dataNascimento?: string;
  endereco?: string;
  cidade?: string;
};

/**
 * Patient data for the widget's `setPaciente` MdHub command — without this
 * the widget renders with only the patient's name pre-filled and the doctor
 * has to hand-type CPF/DOB/address every time. Prefers the appointment's own
 * snapshot fields (accurate as of booking) and falls back to PatientProfile
 * (kept current across visits) — same precedence as the PDF templates'
 * `buildPatientIdLine`/`buildAddressLines`, but returning raw values instead
 * of pre-formatted/labeled strings since Memed wants plain field values.
 */
async function resolvePatientForMemed(appointmentId: string): Promise<MemedPatient> {
  const appt = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: {
      id: true,
      fullName: true,
      email: true,
      dateOfBirth: true,
      patientHealthIdNumber: true,
      addressLine1: true,
      addressLine2: true,
      addressCity: true,
      addressPostalCode: true,
    },
  });

  const profile = await prisma.patientProfile.findUnique({
    where: { email: appt.email.toLowerCase() },
    select: {
      taxIdNumber: true,
      passportNumber: true,
      dateOfBirth: true,
      addressLine1: true,
      addressLine2: true,
      addressCity: true,
      addressPostalCode: true,
    },
  });

  // `patientHealthIdNumber` is the id captured for THIS issuing country
  // (cross-border Rx asks for it at payment) — it wins when present, same
  // rule as buildPatientIdLine. Otherwise fall back to the chart's CPF.
  const cpfRaw = decryptPhi(appt.patientHealthIdNumber) ?? decryptPhi(profile?.taxIdNumber ?? null);
  const passportRaw = cpfRaw ? null : decryptPhi(profile?.passportNumber ?? null);
  const dob = appt.dateOfBirth ?? profile?.dateOfBirth ?? null;

  const addressLine1 = appt.addressLine1 ?? profile?.addressLine1 ?? null;
  const addressLine2 = appt.addressLine2 ?? profile?.addressLine2 ?? null;
  const postalCode = appt.addressPostalCode ?? profile?.addressPostalCode ?? null;
  const endereco = [addressLine1, addressLine2, postalCode].filter(Boolean).join(", ") || undefined;
  const cidade = appt.addressCity ?? profile?.addressCity ?? undefined;

  return {
    idExterno: appt.id,
    nome: appt.fullName,
    cpf: cpfRaw?.replace(/\D/g, "") || undefined,
    passaporte: passportRaw?.replace(/\D/g, "") || undefined,
    dataNascimento: dob ? formatDateBr(dob) : undefined,
    endereco,
    cidade,
  };
}

export async function startWidgetSession(input: {
  doctorId: string;
  appointmentId: string;
}): Promise<{ token: string; scriptUrl: string | null; patient: MemedPatient }> {
  const appt = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, doctorId: input.doctorId },
    select: { id: true, countryCode: true },
  });
  if (!appt) throw new Error("Appointment not found");

  const [token, patient] = await Promise.all([
    ensurePrescriber(input.doctorId, appt.countryCode),
    resolvePatientForMemed(appt.id),
  ]);

  const { env } = await import("../../config/env.js");
  return { token, scriptUrl: env.MEMED_PRESCRIPTION_SCRIPT_URL ?? null, patient };
}
