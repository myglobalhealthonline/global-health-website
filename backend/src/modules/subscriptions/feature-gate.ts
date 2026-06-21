import { prisma } from "../../db/prisma.js";

/**
 * Server-side `subscriptions` feature gate (§36.15). STRICT opt-in: a country
 * offers subscriptions ONLY when its `enabledFeatures` array EXPLICITLY contains
 * "subscriptions". This deliberately bypasses the frontend's "empty array =
 * everything enabled" fallback (country-features.ts) for this key, so the
 * pilot-country rollout can't leak into every country.
 *
 * Verified at BOTH the public pricing route and POST /api/me/subscription
 * (defence in depth — never trust the frontend gate).
 */

const SUBSCRIPTIONS_KEY = "subscriptions";

/** Pure: explicit-presence check (never the empty-array fallback). */
export function isSubscriptionsEnabled(
  enabledFeatures: readonly string[] | null | undefined,
): boolean {
  return Array.isArray(enabledFeatures) && enabledFeatures.includes(SUBSCRIPTIONS_KEY);
}

/** DB lookup by ISO country code (case-insensitive). */
export async function isSubscriptionsEnabledForCountryCode(
  countryCode: string,
): Promise<boolean> {
  // Country codes are stored as-entered (lowercase in this repo); match
  // case-insensitively rather than assuming a canonical case.
  const country = await prisma.country.findFirst({
    where: { code: { equals: countryCode, mode: "insensitive" } },
    select: { enabledFeatures: true },
  });
  if (!country) return false;
  return isSubscriptionsEnabled(country.enabledFeatures);
}
