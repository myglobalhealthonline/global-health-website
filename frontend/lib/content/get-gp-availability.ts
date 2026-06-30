import "server-only";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Server-side fetchers for the same-day GP quick-book.
 *
 *   getGpLanguages    — distinct consultation languages the GP pool offers
 *                       (powers the homepage dropdown; fetched at SSR).
 *   getGpAvailability — aggregated open times for a country + language
 *                       (also used by /book?gp=1 to validate the chosen time).
 *
 * Both degrade to safe empty shapes when the backend is unreachable or the
 * country has no configured same-day GP service.
 */

export type GpAvailabilitySlot = {
  startAt: string;
  endAt: string;
  priceCents: number;
  pricingType: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode: string;
};

export type GpAvailabilityService = {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string;
};

export type GpAvailabilityResult = {
  service: GpAvailabilityService | null;
  clinicTimezone: string;
  slots: GpAvailabilitySlot[];
};

export async function getGpLanguages(
  countryCode: string,
): Promise<{ configured: boolean; languages: string[] }> {
  const empty = { configured: false, languages: [] as string[] };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const url = `${backend}/api/public/gp-languages?country=${encodeURIComponent(countryCode)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { configured?: boolean; languages?: string[] };
    };
    if (!json.ok || !json.data) return empty;
    return {
      configured: Boolean(json.data.configured),
      languages: Array.isArray(json.data.languages) ? json.data.languages : [],
    };
  } catch {
    return empty;
  }
}

export async function getGpAvailability(
  countryCode: string,
  languageCode: string,
  days = 14,
): Promise<GpAvailabilityResult> {
  const empty: GpAvailabilityResult = {
    service: null,
    clinicTimezone: "UTC",
    slots: [],
  };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const url = `${backend}/api/public/gp-availability?country=${encodeURIComponent(
    countryCode,
  )}&language=${encodeURIComponent(languageCode)}&days=${days}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return empty;
    const json = (await res.json()) as { ok?: boolean; data?: GpAvailabilityResult };
    if (!json.ok || !json.data) return empty;
    return {
      service: json.data.service ?? null,
      clinicTimezone: json.data.clinicTimezone ?? "UTC",
      slots: Array.isArray(json.data.slots) ? json.data.slots : [],
    };
  } catch {
    return empty;
  }
}
