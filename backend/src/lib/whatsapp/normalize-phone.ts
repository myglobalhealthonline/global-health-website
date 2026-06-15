/** ISO country code → E.164 calling prefix (no +).
 *  Includes the app's non-ISO market codes (`sp` = Spain, `rm` = Romania)
 *  alongside their ISO equivalents (`es`, `ro`) so normalization works
 *  whichever code a booking carries. */
export const DIAL_CODES: Record<string, string> = {
  ie: "353",
  pt: "351",
  ro: "40",
  rm: "40",
  cz: "420",
  es: "34",
  sp: "34",
  mt: "356",
  pk: "92",
  br: "55",
  uk: "44",
  gb: "44",
};

export type PhoneNormalizeHints = {
  /** Booking / service country (e.g. pt for a Portugal consultation). */
  orderCountryCode?: string | null;
  /** Patient address country when captured at checkout / manual booking. */
  patientAddressCountryCode?: string | null;
};

export type PhoneNormalizeResult = {
  e164: string | null;
  /** Digits-only recipient for WaSender (`923008400763`). */
  digits: string | null;
  /** ISO country used to build E.164 from a local number. */
  countryUsed: string | null;
  raw: string;
};

/** Demo / seed numbers that are not real WhatsApp accounts. */
const PLACEHOLDER_NATIONAL_SUFFIXES = [
  "861234567",
  "871234567",
  "912345678",
  "123456789",
  "12345678",
  "1234567",
] as const;

/** Returns true for obvious placeholder numbers (e.g. +353861234567). */
export function isPlaceholderWhatsAppNumber(
  normalized: Pick<PhoneNormalizeResult, "e164" | "digits">,
): boolean {
  const digits = normalized.digits ?? (normalized.e164 ? cleanPhoneDigits(normalized.e164) : "");
  if (!digits || digits.length < 8) return true;
  return PLACEHOLDER_NATIONAL_SUFFIXES.some((suffix) => digits.endsWith(suffix));
}

/** Normalize a doctor WhatsApp number using the doctor's primary country. */
export function normalizeDoctorWhatsApp(
  raw: string | null | undefined,
  doctorCountryCode: string | null | undefined,
): PhoneNormalizeResult {
  return normalizePhoneForWhatsApp(raw ?? "", {
    orderCountryCode: doctorCountryCode,
  });
}

/** Strip spaces, dashes, parentheses — keep digits only. */
export function cleanPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** WaSender `to` field — E.164 without the leading +. */
export function whatsAppApiRecipient(e164: string): string {
  return cleanPhoneDigits(e164);
}

/**
 * Guess the patient's country from a local number (leading 0).
 * Returns a single match only — ambiguous patterns fall through to hints.
 */
function inferCountryFromLocalNumber(digits: string): string | null {
  if (!digits.startsWith("0")) return null;

  const matches = new Set<string>();

  // Pakistan mobile: 03XX XXXXXXX (11 digits).
  if (/^03\d{9}$/.test(digits)) {
    matches.add("pk");
  }

  // Ireland mobile: 08X XXXXXXX (10 digits).
  if (/^08\d{8}$/.test(digits)) {
    matches.add("ie");
  }

  // Romania mobile: 07XX XXX XXX.
  if (/^07\d{8}$/.test(digits)) {
    matches.add("ro");
  }

  const national = digits.replace(/^0+/, "");

  // Portugal mobile: 9XX XXX XXX (9 digits after stripping trunk 0).
  if (/^9[1236]\d{7}$/.test(national)) {
    matches.add("pt");
  }

  // Spain mobile: 6XX / 7XX (9 digits).
  if (/^[67]\d{8}$/.test(national)) {
    matches.add("es");
  }

  // Czech mobile: 6XX / 7XX (9 digits).
  if (/^[67]\d{8}$/.test(national)) {
    matches.add("cz");
  }

  // Brazil mobile: (XX) 9XXXX-XXXX — local 11 digits, third digit 9.
  if (/^\d{2}9\d{8}$/.test(national) || /^0\d{2}9\d{8}$/.test(digits)) {
    matches.add("br");
  }

  if (matches.size === 1) {
    return [...matches][0]!;
  }
  return null;
}

function resolveCountryForLocalNumber(
  digits: string,
  hints: PhoneNormalizeHints,
): string | null {
  const address = hints.patientAddressCountryCode?.trim().toLowerCase();
  if (address && DIAL_CODES[address]) return address;

  const inferred = inferCountryFromLocalNumber(digits);
  if (inferred) return inferred;

  const order = hints.orderCountryCode?.trim().toLowerCase();
  if (order && DIAL_CODES[order]) return order;

  return null;
}

function applyDialCode(countryCode: string, digits: string): string | null {
  const dial = DIAL_CODES[countryCode.toLowerCase()];
  if (!dial) return null;

  if (digits.startsWith("0")) {
    const national = digits.replace(/^0+/, "");
    return national ? `+${dial}${national}` : null;
  }

  if (!digits.startsWith(dial)) {
    return `+${dial}${digits}`;
  }

  return digits.length >= 8 ? `+${digits}` : null;
}

/**
 * Normalize a phone number to E.164 for WaSender (`+923008400763`).
 *
 * Local numbers like `03008400763` on a Portugal booking are inferred as
 * Pakistan (03 mobile prefix) unless the patient address country is set.
 */
export function normalizePhoneToE164(
  raw: string,
  countryOrHints?: string | null | PhoneNormalizeHints,
): string | null {
  return normalizePhoneForWhatsApp(raw, countryOrHints).e164;
}

export function normalizePhoneForWhatsApp(
  raw: string,
  countryOrHints?: string | null | PhoneNormalizeHints,
): PhoneNormalizeResult {
  const trimmed = raw.trim();
  const hints: PhoneNormalizeHints =
    typeof countryOrHints === "string" || countryOrHints == null
      ? { orderCountryCode: countryOrHints }
      : countryOrHints;

  if (!trimmed) {
    return { e164: null, digits: null, countryUsed: null, raw };
  }

  if (trimmed.includes("@")) {
    return { e164: trimmed, digits: trimmed, countryUsed: null, raw };
  }

  if (trimmed.startsWith("+")) {
    const digits = cleanPhoneDigits(trimmed);
    return {
      e164: digits ? `+${digits}` : null,
      digits: digits || null,
      countryUsed: null,
      raw,
    };
  }

  if (trimmed.startsWith("00")) {
    const digits = cleanPhoneDigits(trimmed.slice(2));
    return {
      e164: digits ? `+${digits}` : null,
      digits: digits || null,
      countryUsed: null,
      raw,
    };
  }

  const digits = cleanPhoneDigits(trimmed);
  if (!digits) {
    return { e164: null, digits: null, countryUsed: null, raw };
  }

  const countryUsed = resolveCountryForLocalNumber(digits, hints);
  if (!countryUsed) {
    const e164 = digits.length >= 8 ? `+${digits}` : null;
    return { e164, digits: e164 ? digits : null, countryUsed: null, raw };
  }

  const e164 = applyDialCode(countryUsed, digits);
  return {
    e164,
    digits: e164 ? whatsAppApiRecipient(e164) : null,
    countryUsed,
    raw,
  };
}

/** @deprecated Use normalizePhoneForWhatsApp — kept for callers that only need ISO hint. */
export function resolveWhatsAppCountryCode(input: {
  orderCountryCode: string;
  patientAddressCountryCode?: string | null;
  phone?: string | null;
}): string {
  const normalized = normalizePhoneForWhatsApp(input.phone ?? "", {
    orderCountryCode: input.orderCountryCode,
    patientAddressCountryCode: input.patientAddressCountryCode,
  });
  return (
    normalized.countryUsed ??
    input.patientAddressCountryCode?.trim().toLowerCase() ??
    input.orderCountryCode.trim().toLowerCase()
  );
}
