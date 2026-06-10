import { createHmac } from "node:crypto";
import { env } from "../config/env.js";

/**
 * HMAC-SHA256 blind indexes for deduplication on encrypted/sensitive fields.
 *
 * Problem: AES-256-GCM encrypted columns can't be LIKE-matched or joined on
 * in SQL. We solve this by storing a stable HMAC of the normalized plaintext
 * alongside the ciphertext — same input always produces the same hash, so
 * equality queries and duplicate detection still work.
 *
 * Safe to ship OFF:
 *   When BLIND_INDEX_KEY is unset, all functions return null and dedup is
 *   disabled. No behaviour change until the key is configured.
 *
 * Required env var (add to env.ts):
 *   BLIND_INDEX_KEY — string, min 32 chars (separate from PHI_ENCRYPTION_KEY;
 *   losing this key means losing dedup capability, NOT the encrypted data).
 */

function blindKey(): string | null {
  // Access the key directly from process.env because env.ts doesn't define
  // BLIND_INDEX_KEY yet — this file documents what's needed, and the guard
  // below is the only consumer of the value.
  const raw = process.env.BLIND_INDEX_KEY?.trim();
  if (!raw || raw.length < 32) return null;
  return raw;
}

/**
 * Core: HMAC-SHA256 of a pre-normalized string.
 * Returns hex string, or null when BLIND_INDEX_KEY is not configured.
 */
export function computeBlindIndex(value: string): string | null {
  const k = blindKey();
  if (!k) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return createHmac("sha256", k).update(normalized, "utf8").digest("hex");
}

/**
 * Blind index for email addresses.
 * Normalization: trim + lowercase (covers typical email case variants).
 */
export function computeEmailBlindIndex(email: string): string | null {
  return computeBlindIndex(email);
}

/**
 * Blind index for phone numbers.
 * Normalization: keep only leading '+' and digits, strip spaces/dashes/dots.
 * "+44 7911 123456" and "+447911123456" produce the same hash.
 */
export function computePhoneBlindIndex(phone: string): string | null {
  const k = blindKey();
  if (!k) return null;
  // Preserve leading '+', strip everything that's not '+' or a digit.
  const normalized = phone
    .trim()
    .replace(/[^+\d]/g, "")      // strip spaces, dashes, dots, parens
    .replace(/(?!^)\+/g, "");    // remove any '+' not at the very start
  if (!normalized) return null;
  return createHmac("sha256", k).update(normalized, "utf8").digest("hex");
}

/**
 * Blind index combining full name + date-of-birth for duplicate-person detection.
 * Normalization:
 *   - name: trim + lowercase + collapse internal whitespace
 *   - dob:  YYYY-MM-DD (ISO date string, time part stripped)
 */
export function computeNameDobBlindIndex(
  fullName: string,
  dob: Date | string,
): string | null {
  const k = blindKey();
  if (!k) return null;
  const normalizedName = fullName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const dobStr =
    dob instanceof Date
      ? dob.toISOString().slice(0, 10)          // "2000-01-15T…" → "2000-01-15"
      : String(dob).trim().slice(0, 10);         // accept "2000-01-15" or ISO
  if (!normalizedName || !dobStr) return null;
  const combined = `${normalizedName}|${dobStr}`;
  return createHmac("sha256", k).update(combined, "utf8").digest("hex");
}

/*
 * What to add to backend/src/config/env.ts:
 *
 *   BLIND_INDEX_KEY: z
 *     .string()
 *     .trim()
 *     .min(32, "BLIND_INDEX_KEY must be at least 32 characters")
 *     .optional(),
 *
 * Generate a key with: openssl rand -base64 48
 * Keep it separate from PHI_ENCRYPTION_KEY.
 */
