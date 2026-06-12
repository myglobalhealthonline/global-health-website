import "server-only";

import { cache } from "react";
import { getBackendOrigin } from "@/lib/server/backend-origin";

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
 */
export const getCountryTrust = cache(
  async (countryCode: string): Promise<CountryTrust | null> => {
    const origin = getBackendOrigin();
    if (!origin) return null;
    const code = countryCode.trim().toLowerCase();
    if (!code) return null;
    try {
      const res = await fetch(`${origin}/api/public/countries/${code}/trust`, {
        method: "GET",
        next: { tags: [`country-trust:${code}`] },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as TrustApiResponse;
      return json.ok && json.data ? json.data.trust : null;
    } catch {
      return null;
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
