import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Application-layer encryption for the most sensitive PatientProfile fields
 * (government IDs). Goal: a database/backup compromise must not yield
 * plaintext national/tax/passport identifiers.
 *
 * Design — safe to ship OFF:
 *   - When PHI_ENCRYPTION_KEY is unset, encryptPhi is a no-op (stores
 *     plaintext). So shipping this changes nothing until the key is set.
 *   - decryptPhi always passes through values that are NOT in the
 *     `phi:v1:` envelope — so legacy plaintext rows keep working during and
 *     after a backfill, and unencrypted writes round-trip fine.
 *   - Once a value IS encrypted, the key must remain available. Losing the
 *     key means losing those fields — manage it like any other secret.
 *
 * AES-256-GCM, random 12-byte IV per value, 16-byte auth tag. Envelope:
 *   phi:v1:<base64url(iv | tag | ciphertext)>
 */

const ENVELOPE_PREFIX = "phi:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer | null {
  const raw = env.PHI_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  // Derive a fixed 32-byte key from the configured secret so any
  // sufficiently-long passphrase works as the key material.
  return createHash("sha256").update(raw).digest();
}

/** True when encryption is configured (a key is present). */
export function isPhiEncryptionEnabled(): boolean {
  return key() !== null;
}

/**
 * Encrypt a single value for storage. Returns the value unchanged when no
 * key is configured or the value is null/empty — so callers can wrap every
 * write unconditionally.
 */
export function encryptPhi(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return value === undefined ? null : value;
  }
  if (value.startsWith(ENVELOPE_PREFIX)) return value; // already encrypted
  const k = key();
  if (!k) return value; // encryption disabled — store plaintext
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENVELOPE_PREFIX + Buffer.concat([iv, tag, ct]).toString("base64url");
}

/**
 * Decrypt a stored value. Passes through anything not in the `phi:v1:`
 * envelope (legacy plaintext), so it is always safe to call on a read.
 */
export function decryptPhi(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!value.startsWith(ENVELOPE_PREFIX)) return value; // plaintext / legacy
  const k = key();
  if (!k) {
    throw new Error(
      "Encountered an encrypted PHI value but PHI_ENCRYPTION_KEY is not set.",
    );
  }
  const buf = Buffer.from(value.slice(ENVELOPE_PREFIX.length), "base64url");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", k, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Encrypt each element of a string array (per-element envelope, no-op-safe). */
export function encryptPhiArray(values: string[]): string[] {
  return values.map((v) => encryptPhi(v) ?? v);
}

/** Decrypt each element of a string array (plaintext-tolerant). */
export function decryptPhiArray(values: string[]): string[] {
  return values.map((v) => decryptPhi(v) ?? v);
}

/** The PatientProfile columns protected by this layer. */
export const PHI_ENCRYPTED_FIELDS = [
  "nationalIdNumber",
  "taxIdNumber",
  "passportNumber",
  "utenteNumber",
] as const;
type PhiField = (typeof PHI_ENCRYPTED_FIELDS)[number];

/** Free-text PatientProfile clinical scalar fields protected by this layer. */
export const CLINICAL_ENCRYPTED_FIELDS = ["bloodType"] as const;
type ClinicalField = (typeof CLINICAL_ENCRYPTED_FIELDS)[number];

/** PatientProfile clinical String[] fields protected by this layer. */
export const CLINICAL_ARRAY_FIELDS = [
  "allergies",
  "chronicDiseases",
  "familyHistory",
  "usualMedication",
] as const;
type ClinicalArrayField = (typeof CLINICAL_ARRAY_FIELDS)[number];

/** Encrypt the clinical scalar + array fields present on a write payload. */
export function encryptClinicalFields<
  T extends Partial<Record<ClinicalField, string | null | undefined>> &
    Partial<Record<ClinicalArrayField, string[] | undefined>>,
>(input: T): T {
  const out: T = { ...input };
  for (const f of CLINICAL_ENCRYPTED_FIELDS) {
    if (f in out) out[f] = encryptPhi(out[f]) as T[ClinicalField];
  }
  for (const f of CLINICAL_ARRAY_FIELDS) {
    if (f in out && out[f]) out[f] = encryptPhiArray(out[f] as string[]) as T[ClinicalArrayField];
  }
  return out;
}

/** Decrypt the clinical scalar + array fields present on a read row. */
export function decryptClinicalFields<
  T extends Partial<Record<ClinicalField, string | null>> &
    Partial<Record<ClinicalArrayField, string[]>>,
>(row: T): T {
  const out: T = { ...row };
  for (const f of CLINICAL_ENCRYPTED_FIELDS) {
    if (f in out) out[f] = decryptPhi(out[f]) as T[ClinicalField];
  }
  for (const f of CLINICAL_ARRAY_FIELDS) {
    if (f in out && out[f]) out[f] = decryptPhiArray(out[f] as string[]) as T[ClinicalArrayField];
  }
  return out;
}

/** Encrypt the PHI fields present on a write payload (in place, immutably). */
export function encryptPhiFields<T extends Partial<Record<PhiField, string | null | undefined>>>(
  input: T,
): T {
  const out: T = { ...input };
  for (const f of PHI_ENCRYPTED_FIELDS) {
    if (f in out) out[f] = encryptPhi(out[f]) as T[PhiField];
  }
  return out;
}

/** Decrypt the PHI fields present on a read row (in place, immutably). */
export function decryptPhiFields<T extends Partial<Record<PhiField, string | null>>>(
  row: T,
): T {
  const out: T = { ...row };
  for (const f of PHI_ENCRYPTED_FIELDS) {
    if (f in out) out[f] = decryptPhi(out[f]) as T[PhiField];
  }
  return out;
}
