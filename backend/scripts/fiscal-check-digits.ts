/**
 * Check-digit validators for the fiscal identifiers each market issues.
 *
 * Pure arithmetic, no database and no config — so the audit script can use them
 * against live rows while the unit tests exercise them with published example
 * values and no environment at all. (They lived in the audit script first, which
 * meant importing them pulled in Prisma and the env validator.)
 *
 * Format alone proves little: "1234567X" is PPS-shaped and meaningless. The
 * check digit is what separates a real number from a plausible-looking one, and
 * a real number for one country essentially never checksums as another's —
 * which is what lets the audit detect a row filed under the wrong market.
 */

const digits = (v: string) => v.replace(/\D/g, "");

/**
 * Portugal — NIF. 9 digits, weights 9..2 over the first 8.
 * check = 11 - (sum mod 11), and 10/11 both mean 0.
 */
export function isValidNif(raw: string): boolean {
  const v = digits(raw);
  if (!/^\d{9}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i += 1) sum += Number(v[i]) * (9 - i);
  const mod = sum % 11;
  const check = mod < 2 ? 0 : 11 - mod;
  return check === Number(v[8]);
}

/**
 * Brazil — CPF. Two check digits, weights 10..2 then 11..2.
 * Repeated-digit strings (00000000000, 11111111111, ...) pass the arithmetic
 * and are rejected explicitly, as everywhere else that validates a CPF.
 */
export function isValidCpf(raw: string): boolean {
  const v = digits(raw);
  if (!/^\d{11}$/.test(v)) return false;
  if (/^(\d)\1{10}$/.test(v)) return false;
  const checkDigit = (upTo: number): number => {
    let sum = 0;
    for (let i = 0; i < upTo; i += 1) sum += Number(v[i]) * (upTo + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return checkDigit(9) === Number(v[9]) && checkDigit(10) === Number(v[10]);
}

/**
 * Ireland — PPSN. 7 digits, a check letter, and optionally a 9th character.
 *
 * sum = Σ digit_i × (8 - i) over the 7 digits; for the 9-character form the
 * trailing letter contributes (A=1 … I=9, W=0) × 9. check = "WABCDEFGHIJKLMNOPQRSTUV"[sum % 23].
 */
export function isValidPpsn(raw: string): boolean {
  const v = raw.trim().toUpperCase().replace(/\s/g, "");
  const m = /^(\d{7})([A-W])([A-IW])?$/.exec(v);
  if (!m) return false;
  const [, seven, check, trailing] = m;
  let sum = 0;
  for (let i = 0; i < 7; i += 1) sum += Number(seven[i]) * (8 - i);
  if (trailing) {
    const extra = trailing === "W" ? 0 : trailing.charCodeAt(0) - 64; // A=1 … I=9
    sum += extra * 9;
  }
  return "WABCDEFGHIJKLMNOPQRSTUV"[sum % 23] === check;
}

/** Spain — DNI (8 digits + letter) and NIE (X/Y/Z + 7 digits + letter). */
export function isValidDniNie(raw: string): boolean {
  const v = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  let body: string;
  let check: string;
  if (/^\d{8}[A-Z]$/.test(v)) {
    body = v.slice(0, 8);
    check = v[8];
  } else if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    body = String("XYZ".indexOf(v[0])) + v.slice(1, 8);
    check = v[8];
  } else {
    return false;
  }
  return "TRWAGMYFPDXBNJZSQVHLCKE"[Number(body) % 23] === check;
}

/**
 * Czechia — rodné číslo. YYMMDD + 3 or 4 digits; the 10-digit form must be
 * divisible by 11. Month carries +50 for women (and +20 in some modern runs).
 */
export function isValidRodneCislo(raw: string): boolean {
  const v = digits(raw);
  if (!/^\d{9,10}$/.test(v)) return false;
  const month = Number(v.slice(2, 4)) % 50 % 20;
  if (month < 1 || month > 12) return false;
  const day = Number(v.slice(4, 6));
  if (day < 1 || day > 31) return false;
  if (v.length === 10 && Number(v) % 11 !== 0) return false;
  return true;
}

/** Romania — CNP. 13 digits, weighted check digit. */
export function isValidCnp(raw: string): boolean {
  const v = digits(raw);
  if (!/^\d{13}$/.test(v)) return false;
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(v[i]) * weights[i];
  const mod = sum % 11;
  return (mod === 10 ? 1 : mod) === Number(v[12]);
}

export const VALIDATORS: Record<string, { name: string; check: (v: string) => boolean }> = {
  PT: { name: "NIF", check: isValidNif },
  BR: { name: "CPF", check: isValidCpf },
  IE: { name: "PPSN", check: isValidPpsn },
  ES: { name: "DNI/NIE", check: isValidDniNie },
  CZ: { name: "Rodné číslo", check: isValidRodneCislo },
  RO: { name: "CNP", check: isValidCnp },
};
