/**
 * Market <-> country mapping for the doctor-dashboard (Mongo) import.
 *
 * The source stores patients in six physical collections named by "market"
 * (patients_ireland, patients_portugal, ...). The target app keys everything by
 * the 2-letter country code used in frontend/data/countries.ts and the Country
 * table. This module is the single, hand-written source of truth for that
 * mapping — do NOT infer it mechanically.
 */

/** Source patient collection suffixes, in a stable order. */
export const MARKETS = [
  "ireland",
  "portugal",
  "spain",
  "czech",
  "romania",
  "brazil",
] as const;

export type Market = (typeof MARKETS)[number];

/** Mongo collection name for a market's patients. */
export function patientCollection(market: Market): string {
  return `patients_${market}`;
}

/** All six patient collection names. */
export const PATIENT_COLLECTIONS = MARKETS.map(patientCollection);

/**
 * market -> ISO 3166-1 alpha-2 country code (lowercase), matching
 * frontend/data/countries.ts and Country.code in the target DB.
 */
const MARKET_TO_COUNTRY: Record<Market, string> = {
  ireland: "ie",
  portugal: "pt",
  spain: "es",
  czech: "cz",
  romania: "ro",
  brazil: "br",
};

export function marketToCountryCode(market: Market): string {
  return MARKET_TO_COUNTRY[market];
}

/** Reverse: country code -> market (for logging / reconciliation). */
export function countryCodeToMarket(code: string): Market | null {
  const lc = code.trim().toLowerCase();
  const hit = (Object.entries(MARKET_TO_COUNTRY) as [Market, string][]).find(
    ([, c]) => c === lc,
  );
  return hit ? hit[0] : null;
}

/** Type guard for a raw string coming from a filename / config. */
export function isMarket(value: string): value is Market {
  return (MARKETS as readonly string[]).includes(value);
}
