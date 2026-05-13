import type { CountryCode } from "@/data/countries";

/**
 * Legacy Wix path family to country mapping.
 * Frontend owns this mapping so old public URLs keep working.
 */
export const legacyPrefixToCountry: Array<{ prefix: string; countryCode: CountryCode }> = [
  { prefix: "/home", countryCode: "ie" },
  { prefix: "/home-pt", countryCode: "pt" },
  { prefix: "/home-sp", countryCode: "sp" },
  { prefix: "/home-cz", countryCode: "cz" },
  { prefix: "/home-rm", countryCode: "rm" },
  { prefix: "/portugal-team", countryCode: "pt" },
  { prefix: "/spain-team", countryCode: "sp" },
  { prefix: "/czechia-team", countryCode: "cz" },
  { prefix: "/romania-team", countryCode: "rm" },
  { prefix: "/ireland-team", countryCode: "ie" },
  { prefix: "/general-consultation-ie", countryCode: "ie" },
  { prefix: "/general-consultation-pt", countryCode: "pt" },
  { prefix: "/general-consultation-sp", countryCode: "sp" },
  { prefix: "/general-consultation-cz", countryCode: "cz" },
  { prefix: "/general-consultation-rm", countryCode: "rm" },
  { prefix: "/specialty-ie", countryCode: "ie" },
  { prefix: "/specialty-pt", countryCode: "pt" },
  { prefix: "/specialty-sp", countryCode: "sp" },
  { prefix: "/specialty-cz", countryCode: "cz" },
  { prefix: "/specialty-rm", countryCode: "rm" },
  { prefix: "/ireland", countryCode: "ie" },
  { prefix: "/ireland-specialist-consultations", countryCode: "ie" },
  { prefix: "/ireland-doctors", countryCode: "ie" },
];

export function matchLegacyRoute(pathname?: string | null): string | null {
  const safePath = (pathname ?? "/").toLowerCase();
  const match = legacyPrefixToCountry.find(
    ({ prefix }) => safePath === prefix || safePath.startsWith(`${prefix}/`),
  );
  return match?.prefix ?? null;
}
