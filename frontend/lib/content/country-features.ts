import type { CountryConfig } from "@/data/countries";

/**
 * Canonical list of country-scoped feature keys. Mirror of the backend's
 * `COUNTRY_FEATURE_KEYS` so the frontend can validate + iterate without
 * a backend round-trip.
 */
export const COUNTRY_FEATURE_KEYS = [
  "country-home",
  "country-content",
  "pages",
  "services",
  "general-consultations",
  "specialist-consultations",
  "online-prescriptions",
  "health-tests",
  "appointments",
] as const;
export type CountryFeatureKey = (typeof COUNTRY_FEATURE_KEYS)[number];

/**
 * Is `feature` enabled for `country`?
 *
 * Backward-compat: when `country.enabledFeatures` is undefined (legacy
 * row before the column existed, or the API didn't return the field),
 * every feature is treated as enabled so the public site never blanks
 * for an under-migrated DB.
 */
export function isCountryFeatureEnabled(
  country: Pick<CountryConfig, "enabledFeatures"> | null | undefined,
  feature: CountryFeatureKey,
): boolean {
  const features = country?.enabledFeatures;
  if (!features || features.length === 0) return true;
  return features.includes(feature);
}
