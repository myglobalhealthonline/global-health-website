import "server-only";

import { cache } from "react";
import { serverReadAuthHeaders } from "@/lib/api/client";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { PUBLIC_CONTENT_FETCH_TIMEOUT_MS } from "@/lib/content/public-content-source";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Country medical-authority trust signals rendered by the footer trust bar
 * and fed into Organization/MedicalBusiness JSON-LD. Sourced from
 * `GET /api/public/countries/:code/trust`. Country is the single source of
 * truth; admins edit these via the country authority-links + legal-profile
 * admin screens.
 */

export type AuthorityCategory =
  | "MEDICAL_REGULATOR"
  | "DOCTOR_REGISTRY"
  | "HEALTH_AUTHORITY"
  | "DATA_PROTECTION"
  | "MEDICINES"
  | "PROFESSIONAL_BODY"
  | "CONSUMER_PROTECTION"
  | "MENTAL_HEALTH"
  | "COMPLAINTS"
  | "EMERGENCY"
  | "OTHER";

export type AuthorityLink = {
  name: string;
  abbreviation: string | null;
  url: string;
  category: AuthorityCategory;
  description: string | null;
  showInFooter: boolean;
  showInSchema: boolean;
};

export type CountryTrust = {
  country: { code: string; name: string };
  regulator: { name: string | null; url: string | null } | null;
  providerRegistration: {
    label: string | null;
    number: string | null;
    url: string | null;
  } | null;
  emergency: {
    number: string;
    notice: string | null;
    nonEmergencyLine: string | null;
  };
  dataProtectionLawName: string;
  authorityLinks: AuthorityLink[];
  /** Present only when a `locale` was passed in. The locale whose copy
   *  actually filled the translatable fields: requested -> country
   *  default -> base columns. */
  resolvedLocale?: string;
};

type TrustApiResponse = {
  ok?: boolean;
  data?: { trust: CountryTrust | null };
};

/**
 * SSR fetch of one country's trust signals. Returns null when the backend is
 * unreachable or the country has no legal/authority data — callers then fall
 * back to generic GDPR / licensed-doctor copy. Cached per-request so the
 * layout, footer and schema can all read it without duplicate requests.
 *
 * `locale` is REQUIRED. It used to be optional, and four page-level callers
 * quietly dropped it — the backend then answered in the country's default
 * language, so the trust bar rendered Portuguese/Czech inside an English page.
 * Making it required moves that from a silent runtime mixed-language bug to a
 * compile error. The backend resolves each translatable text field
 * (regulator/provider-registration labels, emergency notice, data-protection
 * law name, and each authority link's name/abbreviation/description) for it.
 */
export const getCountryTrust = cache(
  async (countryCode: string, locale: LocaleCode): Promise<CountryTrust | null> => {
    const origin = getBackendOrigin();
    if (!origin) return null;
    const code = countryCode.trim().toLowerCase();
    if (!code) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PUBLIC_CONTENT_FETCH_TIMEOUT_MS);
    try {
      const query = locale ? `?locale=${locale.toUpperCase()}` : "";
      const path = `/api/public/countries/${code}/trust${query}`;
      const res = await fetch(`${origin}${path}`, {
        method: "GET",
        // Same `gh-ssr` rate-limit bucket every other server-side public read
        // uses. Without it this lands in the shared egress-IP bucket, 429s
        // under crawl load, and the `!res.ok → null` below silently drops the
        // trust bar and the Organization `sameAs` schema. See lib/api/client.ts.
        headers: serverReadAuthHeaders(path, "GET"),
        // `tags` ALONE does not cache: since Next 15 a bare `fetch` defaults to
        // no-store, so a tag with no `revalidate` only marks an entry that was
        // never written. That made this a real round-trip on every one of the
        // ~550 prerenders — a top contributor to the build saturating the
        // backend's pg pool. 60s matches the other public readers
        // (site-content-api.ts); `revalidateTag` still busts it after an edit.
        next: { revalidate: 60, tags: [`country-trust:${code}`] },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as TrustApiResponse;
      return json.ok && json.data ? json.data.trust : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  },
);

/** The first authority link a patient should use to verify a doctor's
 *  registration — the doctor registry / medical regulator (IMC, OM). */
export function doctorVerificationUrl(trust: CountryTrust | null): string | null {
  if (!trust) return null;
  const registry =
    trust.authorityLinks.find((l) => l.category === "DOCTOR_REGISTRY") ??
    trust.authorityLinks.find((l) => l.category === "MEDICAL_REGULATOR");
  return registry?.url ?? trust.regulator?.url ?? null;
}
