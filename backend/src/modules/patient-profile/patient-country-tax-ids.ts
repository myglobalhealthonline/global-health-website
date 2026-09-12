/**
 * Per-country fiscal / tax identifiers for a patient (PatientCountryTaxId).
 *
 * Why the table exists: a patient who consults in more than one market has more
 * than one fiscal number — an Irish PPS *and* a Portuguese NIF, a Portuguese NIF
 * *and* a Brazilian CPF. `PatientProfile.taxIdNumber` is a single column, so
 * before this it could only hold one of them, and the other market's documents
 * either printed the wrong country's number under a local label or (after the
 * address-country guard in `buildPatientIdLine`) printed nothing at all.
 *
 * Rules enforced here, in one place, so no caller can get them subtly wrong:
 *
 * - Country codes are NORMALIZED (uppercase, legacy aliases folded) before they
 *   ever touch the unique key. `pt`, `PT` and a stray `Pt` are one market.
 * - Values are PHI-encrypted on write and decrypted on read, same `phi:v1:`
 *   envelope as the PatientProfile government-ID columns.
 * - Clearing a number DELETES the row. An empty string row would read as "we
 *   hold a number for this country and it is blank", which is a different and
 *   wrong statement from "we hold none".
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { decryptPhi, encryptPhi } from "../../lib/crypto/phi-crypto.js";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * `SP` and `RM` are legacy aliases of ES and RO in our country table — the same
 * fold `generated-documents-fields.ts` applies before comparing countries. They
 * must not become separate rows from the markets they alias.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  SP: "ES",
  RM: "RO",
  // `PatientProfile.addressCountryCode` is free text, and the live data holds
  // full names and misspellings — PORTUGAL, IRLANDA, IR, PO. They are folded
  // here so "does this patient's address country match the document's" gets the
  // same answer for "PORTUGAL" as for "PT", rather than silently failing and
  // dropping a fiscal number the patient does have.
  PORTUGAL: "PT",
  PO: "PT",
  POR: "PT",
  PRT: "PT",
  IRELAND: "IE",
  IRLANDA: "IE",
  IRLANDE: "IE",
  IR: "IE",
  EIRE: "IE",
  IRL: "IE",
  BRAZIL: "BR",
  BRASIL: "BR",
  BRA: "BR",
  SPAIN: "ES",
  ESPANA: "ES",
  "ESPAÑA": "ES",
  ESP: "ES",
  CZECHIA: "CZ",
  "CZECH REPUBLIC": "CZ",
  CESKO: "CZ",
  CZE: "CZ",
  ROMANIA: "RO",
  ROU: "RO",
};

/** Uppercase + alias-folded ISO-2. Returns null for anything unusable. */
export function normalizeTaxIdCountryCode(code: string | null | undefined): string | null {
  const upper = code?.trim().toUpperCase();
  if (!upper) return null;
  return COUNTRY_ALIASES[upper] ?? upper;
}

export type PatientCountryTaxIdEntry = {
  countryCode: string;
  taxIdNumber: string;
  updatedAt: string;
};

/** Actor recorded on the row. Neither is set for system writes. */
export type CountryTaxIdActor = {
  doctorId?: string | null;
  userId?: string | null;
};

/**
 * Every per-country fiscal number on file, decrypted, ordered by country.
 *
 * Decryption is best-effort per row: a legacy plaintext value, a rotated key or
 * corrupt ciphertext drops that one row rather than failing the whole read — the
 * same degradation `decryptPhiFields` applies to the profile columns.
 */
export async function listPatientCountryTaxIds(
  patientProfileId: string,
  db: Db = prisma,
): Promise<PatientCountryTaxIdEntry[]> {
  const rows = await db.patientCountryTaxId.findMany({
    where: { patientProfileId },
    orderBy: { countryCode: "asc" },
    select: { countryCode: true, taxIdNumber: true, updatedAt: true },
  });
  const out: PatientCountryTaxIdEntry[] = [];
  for (const row of rows) {
    let value: string | null = null;
    try {
      value = decryptPhi(row.taxIdNumber);
    } catch {
      console.warn(
        `[patient-country-tax-ids] failed to decrypt ${row.countryCode} for ${patientProfileId} — dropping`,
      );
      continue;
    }
    if (!value) continue;
    out.push({
      countryCode: row.countryCode,
      taxIdNumber: value,
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  return out;
}

/**
 * The fiscal number valid in `countryCode`, decrypted — or null when the patient
 * has never given us one for that market. Null is the correct answer to print:
 * a blank fiscal line beats a foreign number under a local label.
 */
export async function resolvePatientCountryTaxId(
  patientProfileId: string | null | undefined,
  countryCode: string | null | undefined,
  db: Db = prisma,
): Promise<string | null> {
  const normalized = normalizeTaxIdCountryCode(countryCode);
  if (!patientProfileId || !normalized) return null;
  const row = await db.patientCountryTaxId.findUnique({
    where: { patientProfileId_countryCode: { patientProfileId, countryCode: normalized } },
    select: { taxIdNumber: true },
  });
  if (!row) return null;
  try {
    return decryptPhi(row.taxIdNumber);
  } catch {
    console.warn(
      `[patient-country-tax-ids] failed to decrypt ${normalized} for ${patientProfileId} — treating as absent`,
    );
    return null;
  }
}

/**
 * Set (or clear) the fiscal number for one country.
 *
 * A null/empty value deletes the row — see the module note on why a blank row is
 * not the same statement. Returns the resulting list so callers can answer with
 * the whole set and the UI never has to guess what the write left behind.
 */
export async function setPatientCountryTaxId(
  patientProfileId: string,
  countryCode: string,
  taxIdNumber: string | null | undefined,
  actor: CountryTaxIdActor = {},
  db: Db = prisma,
): Promise<PatientCountryTaxIdEntry[]> {
  const normalized = normalizeTaxIdCountryCode(countryCode);
  if (!normalized) throw new InvalidTaxIdCountryError(countryCode);
  const value = taxIdNumber?.trim() || null;

  if (!value) {
    await db.patientCountryTaxId.deleteMany({
      where: { patientProfileId, countryCode: normalized },
    });
    return listPatientCountryTaxIds(patientProfileId, db);
  }

  const encrypted = encryptPhi(value);
  if (!encrypted) throw new Error("Could not encrypt fiscal number");
  const updatedByDoctorId = actor.doctorId ?? null;
  const updatedByUserId = actor.userId ?? null;
  await db.patientCountryTaxId.upsert({
    where: { patientProfileId_countryCode: { patientProfileId, countryCode: normalized } },
    create: {
      patientProfileId,
      countryCode: normalized,
      taxIdNumber: encrypted,
      updatedByDoctorId,
      updatedByUserId,
    },
    update: { taxIdNumber: encrypted, updatedByDoctorId, updatedByUserId },
  });
  return listPatientCountryTaxIds(patientProfileId, db);
}

/**
 * The fiscal number to print for `countryCode`, including the legacy fallback.
 *
 * This is the ONLY place allowed to decide whether the old single
 * `PatientProfile.taxIdNumber` column may stand in for a country's number, and
 * the rule is deliberately sharp:
 *
 *   - a row for this country            → use it
 *   - no row, but the patient HAS rows  → null, print nothing
 *   - no rows at all                    → fall back to the column
 *
 * The middle case is the one that matters. A patient living in Ireland whose
 * chart column holds a Brazilian CPF passes any address-based check — their
 * address country IS Ireland — so the column printed the CPF under the label
 * "PPS". Once a patient has per-country rows those rows are the whole truth
 * about their fiscal numbers, and a country absent from them means we do not
 * have one: the document prints a blank fiscal line, which is correct.
 *
 * The last case keeps patients whose legacy value could not be attributed to
 * any country (the backfill leaves those alone) rendering exactly as before.
 */
export async function resolveFiscalNumberForCountry(
  patientProfileId: string | null | undefined,
  countryCode: string | null | undefined,
  /**
   * The legacy chart column, DECRYPTED, together with the profile's address
   * country. Both are required: the column carries no country of its own, so
   * the only (weak) evidence it belongs here is that the patient's address
   * country is this country. That check lives inside this function rather than
   * at each call site — every caller forgetting it is how the same mislabelling
   * comes back, and it already did once.
   */
  legacy: { value: string | null | undefined; addressCountryCode: string | null | undefined } | null,
  db: Db = prisma,
): Promise<string | null> {
  const wanted = normalizeTaxIdCountryCode(countryCode);
  const legacyValue = legacy?.value?.trim() || null;
  const legacyCountry = normalizeTaxIdCountryCode(legacy?.addressCountryCode);
  const legacyUsable = legacyValue && wanted && legacyCountry === wanted ? legacyValue : null;

  if (!patientProfileId) return legacyUsable;
  const own = await resolvePatientCountryTaxId(patientProfileId, countryCode, db);
  if (own) return own;
  const anyRow = await db.patientCountryTaxId.findFirst({
    where: { patientProfileId },
    select: { id: true },
  });
  if (anyRow) return null;
  return legacyUsable;
}

/**
 * Record a fiscal number captured by a flow rather than typed into the chart —
 * today the cross-border payment step, which asks the patient for the identifier
 * valid in the country the prescription will be issued in.
 *
 * Never overwrites: a value someone already curated on the chart outranks one
 * re-typed into a checkout form, and this runs inside payment fulfilment where a
 * silent clobber would be invisible. Best-effort — it must never fail the flow
 * that called it.
 */
export async function recordPatientCountryTaxIdIfAbsent(
  patientProfileId: string | null | undefined,
  countryCode: string | null | undefined,
  taxIdNumber: string | null | undefined,
  db: Db = prisma,
): Promise<void> {
  const normalized = normalizeTaxIdCountryCode(countryCode);
  const value = taxIdNumber?.trim() || null;
  if (!patientProfileId || !normalized || !value) return;
  try {
    const encrypted = encryptPhi(value);
    if (!encrypted) return;
    await db.patientCountryTaxId.createMany({
      data: [{ patientProfileId, countryCode: normalized, taxIdNumber: encrypted }],
      skipDuplicates: true,
    });
  } catch (error) {
    console.warn("[patient-country-tax-ids] could not record captured fiscal number", error);
  }
}

export class InvalidTaxIdCountryError extends Error {
  constructor(code: string) {
    super(`Invalid country code: ${code}`);
    this.name = "InvalidTaxIdCountryError";
  }
}
