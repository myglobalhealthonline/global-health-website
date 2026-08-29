import "server-only";
import { serverReadAuthHeaders } from "@/lib/api/client";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { BookabilitySummary } from "./get-country-collections";

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
  bookability: BookabilitySummary | null;
};

export async function getGpLanguages(countryCode: string): Promise<{
  configured: boolean;
  /** Full GP-pool language set — for trust/marketing copy ("N languages spoken"). */
  languages: string[];
  /** Subset with an actual open same-day slot right now — for the booking dropdown. */
  bookableLanguages: string[];
}> {
  const empty = { configured: false, languages: [] as string[], bookableLanguages: [] as string[] };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const url = `${backend}/api/public/gp-languages?country=${encodeURIComponent(countryCode)}`;
  try {
    // Short TTL — bookableLanguages tracks live availability, not just config.
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: serverReadAuthHeaders(url.slice(backend.length), "GET"),
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { configured?: boolean; languages?: string[]; bookableLanguages?: string[] };
    };
    if (!json.ok || !json.data) return empty;
    return {
      configured: Boolean(json.data.configured),
      languages: Array.isArray(json.data.languages) ? json.data.languages : [],
      bookableLanguages: Array.isArray(json.data.bookableLanguages)
        ? json.data.bookableLanguages
        : [],
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
    bookability: null,
  };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const url = `${backend}/api/public/gp-availability?country=${encodeURIComponent(
    countryCode,
  )}&language=${encodeURIComponent(languageCode)}&days=${days}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: serverReadAuthHeaders(url.slice(backend.length), "GET"),
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as { ok?: boolean; data?: GpAvailabilityResult };
    if (!json.ok || !json.data) return empty;
    return {
      service: json.data.service ?? null,
      clinicTimezone: json.data.clinicTimezone ?? "UTC",
      slots: Array.isArray(json.data.slots) ? json.data.slots : [],
      bookability: json.data.bookability ?? null,
    };
  } catch {
    return empty;
  }
}
