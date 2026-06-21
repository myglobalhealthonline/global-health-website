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
  // Monthly subscription plans (Wave 0). STRICT OPT-IN — see below.
  "subscriptions",
] as const;
export type CountryFeatureKey = (typeof COUNTRY_FEATURE_KEYS)[number];

/**
 * Features that must NEVER be enabled by the "empty = all enabled"
 * backward-compat fallback. They are on ONLY when explicitly present in
 * `enabledFeatures`. Subscriptions is opt-in per pilot country (§36.15)
 * so it can't leak into every market via an under-migrated/empty row.
 */
const STRICT_OPT_IN_FEATURES = new Set<CountryFeatureKey>(["subscriptions"]);

/**
 * Is `feature` enabled for `country`?
 *
 * Backward-compat: when `country.enabledFeatures` is undefined (legacy
 * row before the column existed, or the API didn't return the field),
 * every feature is treated as enabled so the public site never blanks
 * for an under-migrated DB — EXCEPT strict-opt-in features, which require
 * explicit presence.
 */
export function isCountryFeatureEnabled(
  country: Pick<CountryConfig, "enabledFeatures"> | null | undefined,
  feature: CountryFeatureKey,
): boolean {
  const features = country?.enabledFeatures;
  if (STRICT_OPT_IN_FEATURES.has(feature)) {
    return Array.isArray(features) && features.includes(feature);
  }
  if (!features || features.length === 0) return true;
  return features.includes(feature);
}
