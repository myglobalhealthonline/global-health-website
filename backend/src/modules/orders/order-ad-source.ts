/**
 * Which ad network drove an order, derived from the attribution blob captured
 * at landing (`Order.adAttribution` — see
 * `frontend/components/analytics/AttributionCapture.tsx`).
 *
 * Derived, never stored: the rule for "this is Meta traffic" is a reporting
 * decision that will change (a new utm_source spelling, another network), and
 * a stored column would freeze whatever the rule was on the day each order was
 * placed. Recomputing on read keeps every historical order consistent with the
 * current rule.
 *
 * `fbc` counts alongside `fbclid` because the pixel writes `_fbc` from a click
 * id we may never have seen in the URL ourselves (a click id stripped by an
 * in-app browser redirect still lands in the cookie). `utm_source` is the
 * fallback for campaigns whose click id was stripped entirely — Meta's own ad
 * manager writes `facebook`/`instagram` there.
 */
export type OrderAdSource = "META";

const META_UTM_SOURCES = new Set(["facebook", "instagram", "meta", "fb", "ig"]);

export function orderAdSource(adAttribution: unknown): OrderAdSource | null {
  if (typeof adAttribution !== "object" || adAttribution === null) return null;
  const a = adAttribution as Record<string, unknown>;

  const nonEmpty = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
  if (nonEmpty(a.fbclid) || nonEmpty(a.fbc)) return "META";

  const utmSource = typeof a.utmSource === "string" ? a.utmSource.trim().toLowerCase() : "";
  if (META_UTM_SOURCES.has(utmSource)) return "META";

  return null;
}

/**
 * The campaign fields safe to show an admin. Deliberately excludes `fbp`/`fbc`,
 * `clientIp` and `clientUserAgent`: those are tracking identifiers that exist
 * only to raise Conversions API match quality, and nothing in the admin UI is
 * improved by rendering them.
 */
export type OrderAdCampaign = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPath: string | null;
};

export function orderAdCampaign(adAttribution: unknown): OrderAdCampaign | null {
  if (typeof adAttribution !== "object" || adAttribution === null) return null;
  const a = adAttribution as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, 200) : null;

  const campaign: OrderAdCampaign = {
    utmSource: str(a.utmSource),
    utmMedium: str(a.utmMedium),
    utmCampaign: str(a.utmCampaign),
    landingPath: str(a.landingPath),
  };
  return Object.values(campaign).some((v) => v !== null) ? campaign : null;
}
