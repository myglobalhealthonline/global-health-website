/**
 * Parser + mapper for the HubSpot-style contacts.csv export.
 * Country is derived from the PHONE dial prefix (per the migration decision),
 * with the address country only used as a fallback for reporting.
 */
import fs from "node:fs";

/** Minimal RFC4180 CSV parser (handles quotes, embedded commas/newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 1; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export function readCsvRecords(file: string): Record<string, string>[] {
  let text = fs.readFileSync(file, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    if (r.length === 1 && r[0].trim() === "") continue;
    const rec: Record<string, string> = {};
    header.forEach((h, j) => { rec[h] = (r[j] ?? "").trim(); });
    out.push(rec);
  }
  return out;
}

/** Excel text-guard apostrophe + spaces stripped; keeps leading +. */
export function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.replace(/^'+/, "").replace(/[^\d+]/g, "");
  if (!s) return null;
  return s.startsWith("+") ? s : `+${s}`;
}

/**
 * Dial prefix -> market country code. LONGEST prefix first: +420 (cz) must be
 * tested before +40 (ro), and +351/+353 before +35x generic.
 */
const DIAL_TO_COUNTRY: Array<[string, string]> = [
  ["+353", "ie"],
  ["+351", "pt"],
  ["+420", "cz"],
  ["+55", "br"],
  ["+40", "ro"],
  ["+34", "es"],
];

export function countryFromPhone(phone: string | null): string | null {
  if (!phone) return null;
  for (const [dial, code] of DIAL_TO_COUNTRY) {
    if (phone.startsWith(dial)) return code;
  }
  return null;
}

const ADDR_COUNTRY_TO_CODE: Record<string, string> = {
  ireland: "ie", irlanda: "ie",
  portugal: "pt",
  spain: "es", espanha: "es", españa: "es",
  czechia: "cz", "czech republic": "cz",
  romania: "ro", roménia: "ro", romenia: "ro",
  brazil: "br", brasil: "br",
};

export function countryFromAddress(name: string | undefined): string | null {
  if (!name) return null;
  return ADDR_COUNTRY_TO_CODE[name.trim().toLowerCase()] ?? null;
}

export interface Contact {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  countryFromPhone: string | null;
  countryFromAddress: string | null;
  dateOfBirth: Date | null;
  addressLine1: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  taxIdNumber: string | null;      // VAT ID
  nationalIdNumber: string | null; // Identification Doc. Number
  utente: string | null;           // Numero Utente
  pharmacy: string | null;
  labels: string | null;
  language: string | null;
}

function pick(rec: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k]?.trim();
    if (v) return v;
  }
  return null;
}

export function mapContact(rec: Record<string, string>): Contact {
  const first = rec["First Name"]?.trim() ?? "";
  const last = rec["Last Name"]?.trim() ?? "";
  const fullName = [first, last].filter(Boolean).join(" ").trim() || null;
  const email = (pick(rec, ["Email 1", "Email 2"]) ?? "").toLowerCase() || null;
  const phone = normalizePhone(pick(rec, ["Phone 1", "Phone 2", "Telefone 2"]) ?? undefined);
  const dobRaw = pick(rec, ["Birthdate"]);
  const dob = dobRaw ? new Date(dobRaw) : null;
  return {
    fullName,
    email,
    phone,
    countryFromPhone: countryFromPhone(phone),
    countryFromAddress: countryFromAddress(pick(rec, ["Address 1 - Country"]) ?? undefined),
    dateOfBirth: dob && !Number.isNaN(dob.getTime()) ? dob : null,
    addressLine1: pick(rec, ["Address 1 - Street"]),
    addressCity: pick(rec, ["Address 1 - City"]),
    addressPostalCode: pick(rec, ["Address 1 - Zip"]),
    taxIdNumber: pick(rec, ["VAT ID", "ID do imposto"]),
    nationalIdNumber: pick(rec, ["Identification Doc. Number"]),
    utente: pick(rec, ["Numero Utente", "Numero utente"]),
    pharmacy: pick(rec, ["Pharmacy Name"]),
    labels: pick(rec, ["Labels", "Etiquetas"]),
    language: pick(rec, ["Language"]),
  };
}
