/**
 * IBAN helpers — normalize, validate (ISO 13616 mod-97), and mask for display.
 * Used for doctor payout bank details. We never log or echo a full IBAN; the
 * masked form (last 4) is what surfaces in UIs.
 */

/** Strip spaces/punctuation and uppercase. */
export function normalizeIban(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Validate an IBAN: structural check + ISO 13616 mod-97 == 1.
 * Accepts already-normalized or spaced input.
 */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  // Move the first four chars to the end, then replace letters with numbers
  // (A=10 … Z=35) and compute mod 97 over the resulting big integer.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch >= "A" && ch <= "Z" ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const digit of code) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

/** Last 4 characters of a (normalized) IBAN, or null. */
export function ibanLast4(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iban = normalizeIban(raw);
  return iban.length >= 4 ? iban.slice(-4) : iban;
}

/** Masked display form, e.g. "•••• 1234". Null when no value. */
export function maskIban(last4: string | null | undefined): string | null {
  if (!last4) return null;
  return `•••• ${last4}`;
}

const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

/** Validate a BIC/SWIFT (8 or 11 chars). */
export function isValidBic(raw: string): boolean {
  return BIC_RE.test(raw.replace(/\s/g, "").toUpperCase());
}
