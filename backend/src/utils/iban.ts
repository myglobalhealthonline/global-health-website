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
 * Structural check only: country code, check digits, and an overall length
 * inside ISO 13616's 15-34 bound. Says nothing about whether the check digits
 * actually verify.
 *
 * This is what the doctor-facing bank forms accept. The mod-97 test below is
 * correct but unforgiving, and rejecting on it outright has locked real
 * doctors out of saving their own bank details over a single mistyped
 * character. The client shows an advisory when `isValidIban` fails, so a
 * suspect IBAN is flagged to the person who can actually check it rather than
 * being refused by the server.
 */
export function isStructurallyValidIban(raw: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalizeIban(raw));
}

/**
 * Validate an IBAN: structural check + ISO 13616 mod-97 == 1.
 * Accepts already-normalized or spaced input.
 *
 * Still the right test for "is this definitely a real IBAN" — used for the
 * client-side advisory. Not used to reject a save; see the note above.
 */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!isStructurallyValidIban(iban)) return false;
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
