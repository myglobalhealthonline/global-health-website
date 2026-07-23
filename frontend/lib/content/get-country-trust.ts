import "server-only";

import { cache } from "react";
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
 * `locale` is optional and additive: omitted keeps the previous behavior
 * (country default-locale copy). When passed, the backend resolves each
 * translatable text field (regulator/provider-registration labels,
 * emergency notice, data-protection law name, and each authority link's
 * name/abbreviation/description) for that locale.
 */
export const getCountryTrust = cache(
  async (countryCode: string, locale?: LocaleCode): Promise<CountryTrust | null> => {
    const origin = getBackendOrigin();
    if (!origin) return null;
    const code = countryCode.trim().toLowerCase();
    if (!code) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PUBLIC_CONTENT_FETCH_TIMEOUT_MS);
    try {
      const query = locale ? `?locale=${locale.toUpperCase()}` : "";
      const res = await fetch(`${origin}/api/public/countries/${code}/trust${query}`, {
        method: "GET",
        next: { tags: [`country-trust:${code}`] },
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
