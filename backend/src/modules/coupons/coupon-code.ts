import { randomInt } from "node:crypto";

/**
 * Coupon codes are stored and compared in UPPERCASE. Every entry point — admin
 * create, admin validate, public check, checkout, manual booking — normalizes
 * through here first, so "  summer-20 " and "SUMMER-20" are the same coupon.
 */
export function normalizeCouponCode(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/** 4–32 chars, starts alphanumeric, hyphens allowed inside. */
export const COUPON_CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{3,31}$/;

export function isValidCouponCodeShape(code: string): boolean {
  return COUPON_CODE_REGEX.test(code);
}

/**
 * Unambiguous alphabet — no O/0 or I/1, because these codes get read aloud on
 * the phone and copied out of an email by hand.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 10 chars from a 32-symbol alphabet ≈ 50 bits — not guessable at 10 req/min. */
export function generateCouponCode(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
