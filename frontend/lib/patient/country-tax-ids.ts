import { countries as seedCountries } from "@/data/countries";

/**
 * Per-country fiscal / tax identifiers — the client-side twin of the backend's
 * `patientTaxIdLabel` and `normalizeTaxIdCountryCode`.
 *
 * A patient consulting in two markets holds two of these numbers (an Irish PPS
 * and a Portuguese NIF, a Portuguese NIF and a Brazilian CPF), and the document
 * issued in each market must carry the one valid THERE. The portals let the
 * patient, the treating doctor and an admin maintain the whole set.
 *
 * The label map is duplicated here rather than fetched because it is the label
 * on an input the user is typing into — a round trip to learn the word "NIF"
 * would show them "Tax ID" first and then swap it under their cursor. Keep it in
 * step with backend/src/modules/generated-documents/generated-documents-fields.ts.
 */

const FISCAL_LABELS: Record<string, string> = {
  PT: "NIF",
  BR: "CPF",
  IE: "PPS",
  ES: "DNI",
  SP: "DNI",
  CZ: "Rodné číslo",
  RM: "CNP",
  RO: "CNP",
};

/** `SP`/`RM` are legacy aliases of ES/RO in the country table. */
const COUNTRY_ALIASES: Record<string, string> = { SP: "ES", RM: "RO" };

/** Uppercase + alias-folded, so one market can never render as two rows. */
export function normalizeFiscalCountry(code: string | null | undefined): string | null {
  const upper = code?.trim().toUpperCase();
  if (!upper) return null;
  return COUNTRY_ALIASES[upper] ?? upper;
}

/** "NIF", "CPF", "PPS"… falling back to a generic label for other markets. */
export function fiscalLabelForCountry(code: string | null | undefined): string {
  const upper = normalizeFiscalCountry(code);
  if (!upper) return "Tax ID";
  return FISCAL_LABELS[upper] ?? "Tax ID";
}

export type FiscalCountryOption = { code: string; name: string; label: string };

/**
 * Countries offerable in the "add a fiscal number" picker: every market the
 * platform serves, plus any country the patient already holds a number for
 * (a legacy or admin-entered row for a market we no longer list must still be
 * editable, not stranded).
 */
export function fiscalCountryOptions(
  alreadyPresent: readonly string[] = [],
): FiscalCountryOption[] {
  const byCode = new Map<string, FiscalCountryOption>();
  for (const country of seedCountries) {
    const code = normalizeFiscalCountry(country.code);
    if (!code) continue;
    byCode.set(code, { code, name: country.name, label: fiscalLabelForCountry(code) });
  }
  for (const raw of alreadyPresent) {
    const code = normalizeFiscalCountry(raw);
    if (!code || byCode.has(code)) continue;
    byCode.set(code, { code, name: code, label: fiscalLabelForCountry(code) });
  }
  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export type CountryTaxIdEntry = {
  countryCode: string;
  taxIdNumber: string;
  updatedAt?: string;
};
