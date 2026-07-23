import "server-only";

import { cache } from "react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { PUBLIC_CONTENT_FETCH_TIMEOUT_MS } from "@/lib/content/public-content-source";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Per-country footer fields the public site renders. Narrower than the
 * backend `CountryFooterDto` — the admin DTO ships id/countryId/
 * updatedAt for the edit-form prefill, but SiteFooter never references
 * those. Drop them here so the public type stays focused on what the
 * footer actually displays.
 */
export type PublicCountryFooter = {
  countryCode: string;
  countryName: string;
  tagline: string | null;
  contactAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactHours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  customColumns: Array<{
    title: string;
    links: Array<{ label: string; href: string; external?: boolean }>;
  }>;
  copyrightLine: string | null;
  isActive: boolean;
  /** Present only when a `locale` was passed in. The locale whose copy
   *  actually filled the translatable fields: requested -> country
   *  default -> base columns. */
  resolvedLocale?: string;
};

type FooterApiResponse = {
  ok?: boolean;
  data?: { footer: PublicCountryFooter | null };
};

/**
 * SSR-side fetch of one country's published footer. Returns null when
 * the backend is unreachable, the country has no footer row, or the
 * row is soft-disabled — SiteFooter then falls back to defaults.
 *
 * `locale` is optional and additive: omitted keeps the previous behavior
 * (country default-locale copy). When passed, the backend resolves the
 * translatable fields (tagline, contactHours, customColumns,
 * copyrightLine) for that locale — see CountryFooterTranslation.
 *
 * Cached per-request via React.cache so SiteLayout can fetch every
 * country's footer in parallel without duplicate requests.
 */
export const getCountryFooter = cache(
  async (countryCode: string, locale?: LocaleCode): Promise<PublicCountryFooter | null> => {
    const origin = getBackendOrigin();
    if (!origin) return null;
    const code = countryCode.trim().toLowerCase();
    if (!code) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PUBLIC_CONTENT_FETCH_TIMEOUT_MS);
    try {
      const query = locale ? `?locale=${locale.toUpperCase()}` : "";
      const res = await fetch(`${origin}/api/public/countries/${code}/footer${query}`, {
        method: "GET",
        // Next.js data cache — admin save calls revalidatePath(`/${slug}`, "layout")
        // so we can safely cache here without a TTL. If the layout call ever
        // changes, swap to `cache: "no-store"`.
        next: { tags: [`country-footer:${code}`] },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as FooterApiResponse;
      return json.ok && json.data ? json.data.footer : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  },
);

