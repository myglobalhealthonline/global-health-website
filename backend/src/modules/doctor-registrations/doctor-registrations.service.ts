import { prisma } from "../../db/prisma.js";
import { defaultChamberEntityForCountry } from "../../lib/doctor-registration-display.js";
import { encryptPhi, decryptPhi } from "../../lib/crypto/phi-crypto.js";

export type DoctorRegistrationInput = {
  chamberEntity?: string | null;
  registrationNumber?: string | null;
  division?: string | null;
  isVerified?: boolean;
  /** Write-only plaintext in — never read back. Empty string clears the
   *  stored CPF; `undefined` leaves it untouched. */
  cpf?: string;
};

export type DoctorRegistrationRow = {
  id: string;
  doctorId: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  chamberEntity: string | null;
  registrationNumber: string | null;
  division: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  active: boolean;
  /** Masked last 4 digits only — same contract as DoctorBankAccount's
   *  ibanLast4. Never the decrypted CPF. */
  cpfLast4: string | null;
};

function cpfLast4Of(cpf: string): string | null {
  const digits = cpf.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

/**
 * Per-market doctor medical-registration rows. Lives on the existing
 * DoctorCountry M:N link table — same row that lists the doctor on a
 * country's public roster also holds the chamber + registration number
 * used on prescription PDFs for that country.
 *
 * Admin-only writes. Reads are joined with `Country` so the caller can
 * render the code/name without a second round-trip.
 */
export async function listDoctorRegistrations(
  doctorId: string,
): Promise<DoctorRegistrationRow[]> {
  const rows = await prisma.doctorCountry.findMany({
    where: { doctorId },
    select: {
      id: true,
      doctorId: true,
      countryId: true,
      chamberEntity: true,
      registrationNumber: true,
      division: true,
      isVerified: true,
      verifiedAt: true,
      active: true,
      cpfLast4: true,
      country: { select: { code: true, name: true } },
    },
    orderBy: [{ active: "desc" }, { country: { name: "asc" } }],
  });
  return rows.map((r) => ({
    id: r.id,
    doctorId: r.doctorId,
    countryId: r.countryId,
    countryCode: r.country.code,
    countryName: r.country.name,
    chamberEntity: r.chamberEntity,
    registrationNumber: r.registrationNumber,
    division: r.division,
    isVerified: r.isVerified,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    active: r.active,
    cpfLast4: r.cpfLast4,
  }));
}

export class DoctorOrCountryNotFoundError extends Error {
  constructor() {
    super("Doctor or country not found");
    this.name = "DoctorOrCountryNotFoundError";
  }
}

/**
 * Upsert the registration on the DoctorCountry link row for
 * (doctorId, countryId). If the link doesn't exist yet, create it.
 * Setting `isVerified=true` stamps `verifiedAt = now()`; flipping it
 * back to false clears `verifiedAt` so admins can see when a
 * verification was withdrawn.
 *
 * Returns the saved row joined with the country (same shape as `list`).
 */
export async function upsertDoctorRegistration(
  doctorId: string,
  countryId: string,
  input: DoctorRegistrationInput,
): Promise<DoctorRegistrationRow> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true },
  });
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { id: true, code: true, name: true },
  });
  if (!doctor || !country) {
    throw new DoctorOrCountryNotFoundError();
  }

  const registrationNumber = normalizeString(input.registrationNumber, 64);
  const division = normalizeString(input.division, 120);
  const chamberEntity =
    normalizeString(input.chamberEntity, 64) ??
    (registrationNumber ? defaultChamberEntityForCountry(country.code) : null);

  // Only stamp verifiedAt when transitioning *to* verified — keeps the
  // historical stamp stable if admin re-edits the same row without
  // changing the verified flag.
  const existing = await prisma.doctorCountry.findUnique({
    where: { doctorId_countryId: { doctorId, countryId } },
    select: { isVerified: true, verifiedAt: true },
  });

  let isVerified = input.isVerified;
  if (typeof isVerified !== "boolean") {
    isVerified = existing?.isVerified ?? false;
  }
  let verifiedAt: Date | null = existing?.verifiedAt ?? null;
  if (isVerified && !existing?.isVerified) {
    verifiedAt = new Date();
  } else if (!isVerified) {
    verifiedAt = null;
  }

  // Write-only: undefined leaves the stored CPF untouched, "" clears it,
  // anything else encrypts + replaces it. Never decrypted/echoed back here.
  let cpfWrite: { cpfEncrypted: string | null; cpfLast4: string | null } | undefined;
  if (input.cpf !== undefined) {
    const trimmed = input.cpf.trim();
    cpfWrite = trimmed
      ? { cpfEncrypted: encryptPhi(trimmed), cpfLast4: cpfLast4Of(trimmed) }
      : { cpfEncrypted: null, cpfLast4: null };
  }

  const saved = await prisma.doctorCountry.upsert({
    where: { doctorId_countryId: { doctorId, countryId } },
    update: {
      chamberEntity,
      registrationNumber,
      division,
      isVerified,
      verifiedAt,
      // Re-activate the row when a registration is set. Profile-save
      // flow may have deactivated this row (admin unticked the country
      // without realising it held registration data) — saving the
      // registration here makes the country visible again so the data
      // surfaces on the public roster.
      active: true,
      ...cpfWrite,
    },
    create: {
      doctorId,
      countryId,
      chamberEntity,
      registrationNumber,
      division,
      isVerified,
      verifiedAt,
      active: true,
      ...cpfWrite,
    },
    select: {
      id: true,
      doctorId: true,
      countryId: true,
      chamberEntity: true,
      registrationNumber: true,
      division: true,
      isVerified: true,
      verifiedAt: true,
      active: true,
      cpfLast4: true,
    },
  });

  return {
    id: saved.id,
    doctorId: saved.doctorId,
    countryId: saved.countryId,
    countryCode: country.code,
    countryName: country.name,
    chamberEntity: saved.chamberEntity,
    registrationNumber: saved.registrationNumber,
    division: saved.division,
    isVerified: saved.isVerified,
    verifiedAt: saved.verifiedAt?.toISOString() ?? null,
    active: saved.active,
    cpfLast4: saved.cpfLast4,
  };
}

/**
 * Look up the doctor's registration for a given country code — used at
 * PDF render time so prescriptions for, say, a PT appointment print the
 * OM number rather than the IE IMC number.
 */
export async function getDoctorRegistrationByCountryCode(
  doctorId: string,
  countryCode: string,
): Promise<DoctorRegistrationRow | null> {
  const row = await prisma.doctorCountry.findFirst({
    // Case-insensitive: Country.code is stored lowercase ("pt", "ie") while
    // callers pass whatever the appointment carries. An exact match on an
    // upper-cased code silently found nothing, which sent every document to
    // the old cross-country fallback and printed the wrong market's number.
    where: { doctorId, country: { code: { equals: countryCode, mode: "insensitive" } } },
    select: {
      id: true,
      doctorId: true,
      countryId: true,
      chamberEntity: true,
      registrationNumber: true,
      division: true,
      isVerified: true,
      verifiedAt: true,
      active: true,
      cpfLast4: true,
      country: { select: { code: true, name: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    doctorId: row.doctorId,
    countryId: row.countryId,
    countryCode: row.country.code,
    countryName: row.country.name,
    chamberEntity: row.chamberEntity,
    registrationNumber: row.registrationNumber,
    division: row.division,
    isVerified: row.isVerified,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    active: row.active,
    cpfLast4: row.cpfLast4,
  };
}

/**
 * Decrypted CPF for server-side use ONLY (Memed prescriber registration —
 * modules/memed/prescription-widget.service.ts ensurePrescriber). Never
 * exposed through any admin GET; that path only ever sees `cpfLast4`.
 */
export async function getDecryptedDoctorCpf(
  doctorId: string,
  countryCode: string,
): Promise<string | null> {
  const row = await prisma.doctorCountry.findFirst({
    where: { doctorId, country: { code: { equals: countryCode, mode: "insensitive" } } },
    select: { cpfEncrypted: true },
  });
  if (!row?.cpfEncrypted) return null;
  return decryptPhi(row.cpfEncrypted);
}

function normalizeString(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}
