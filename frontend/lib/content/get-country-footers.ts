import "server-only";

import { cache } from "react";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Per-country footer DTO mirrors the backend `CountryFooterDto`
 * shape — see backend/src/validations/country-footer.schema.ts.
 */
export type PublicCountryFooter = {
  id: string;
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
  customColumns: Array<{
    title: string;
    links: Array<{ label: string; href: string; external?: boolean }>;
  }>;
  copyrightLine: string | null;
  isActive: boolean;
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
 * Cached per-request via React.cache so SiteLayout can fetch every
 * country's footer in parallel without duplicate requests.
 */
export const getCountryFooter = cache(
  async (countryCode: string): Promise<PublicCountryFooter | null> => {
    const origin = getBackendOrigin();
    if (!origin) return null;
    const code = countryCode.trim().toLowerCase();
    if (!code) return null;
    try {
      const res = await fetch(`${origin}/api/public/countries/${code}/footer`, {
        method: "GET",
        // Next.js data cache — admin save calls revalidatePath(`/${slug}`, "layout")
        // so we can safely cache here without a TTL. If the layout call ever
        // changes, swap to `cache: "no-store"`.
        next: { tags: [`country-footer:${code}`] },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as FooterApiResponse;
      return json.ok && json.data ? json.data.footer : null;
    } catch {
      return null;
    }
  },
);

/**
 * Bulk-fetch every country's footer. Parallel calls; failed lookups
 * return null in the map entry so SiteFooter renders defaults for
 * those countries.
 */
export async function getAllCountryFooters(
  countryCodes: string[],
): Promise<Record<string, PublicCountryFooter | null>> {
  const entries = await Promise.all(
    countryCodes.map(async (code) => {
      const footer = await getCountryFooter(code);
      return [code.toLowerCase(), footer] as const;
    }),
  );
  return Object.fromEntries(entries);
}
