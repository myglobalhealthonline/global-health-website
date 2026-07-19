/**
 * Single source of truth for the clinic postal address shown on every
 * generated document (invoice PDF, DOCX certificates). Keyed by country;
 * Ireland is also the fallback for any country without its own clinic.
 */
export const CLINIC_ADDRESSES = {
  CZ: ["Rybna 716/24", "Praha 1", "11000 Praha", "Czech Republic"],
  PT: ["Rua Brincos Princesa 13", "2710-683 Sintra", "Portugal"],
  IE: ["6-9 Trinity Street", "Dublin 2", "D02 EY47", "Ireland"],
} as const;

/**
 * Resolves a country code (app code like "cz"/"pt"/"ie", or the "IR" DOCX
 * template prefix) to its clinic address lines. Case-insensitive; any other
 * or missing code falls back to Ireland.
 */
export function clinicAddressLines(countryCode?: string | null): readonly string[] {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (code === "CZ") return CLINIC_ADDRESSES.CZ;
  if (code === "PT") return CLINIC_ADDRESSES.PT;
  return CLINIC_ADDRESSES.IE; // IE, IR (template prefix), and every unknown/missing code
}
