import type {
  CountryDeleteBlockers,
  CountryDeleteImpact,
  CountryDeleteRemovableConfiguration,
} from "@/lib/admin/admin-api";

/**
 * The decision logic behind `DeleteCountryButton`, kept out of the component
 * so it is testable in the frontend's DOM-less unit suite (AZ-3).
 *
 * Everything here works on COUNTS. No label, no rendered string and no branch
 * touches a name, an address, an email or any other record field — the impact
 * endpoint does not return them and this module could not surface them if it
 * did.
 */

export const COUNTRY_BLOCKER_LABELS: Record<keyof CountryDeleteBlockers, [string, string]> = {
  doctors: ["doctor profile", "doctor profiles"],
  appointments: ["appointment", "appointments"],
  clinicalRecords: ["clinical record", "clinical records"],
  patientRecords: ["patient record", "patient records"],
  membershipEnrollments: ["membership enrollment", "membership enrollments"],
  allowanceBalances: ["allowance balance", "allowance balances"],
  allowanceUsage: ["allowance usage entry", "allowance usage entries"],
  subscriptions: ["subscription", "subscriptions"],
  financialRecords: ["financial record", "financial records"],
  corporateRecords: ["corporate record", "corporate records"],
  legalDocuments: ["legal document", "legal documents"],
  jobListings: ["job listing", "job listings"],
};

export const COUNTRY_CONFIG_LABELS: Record<
  keyof CountryDeleteRemovableConfiguration,
  [string, string]
> = {
  locales: ["locale", "locales"],
  domains: ["domain", "domains"],
  clinics: ["clinic", "clinics"],
  specialties: ["specialty", "specialties"],
  services: ["service", "services"],
  healthTests: ["health test", "health tests"],
  pricingPlans: ["pricing plan", "pricing plans"],
  membershipPlans: ["membership plan", "membership plans"],
  contentPages: ["content page", "content pages"],
  seoLandingPages: ["landing page", "landing pages"],
  mediaAssets: ["media item", "media items"],
  testCenters: ["test center", "test centers"],
  insuranceCompanies: ["insurer", "insurers"],
  marketSettings: ["settings record", "settings records"],
};

/** "3 membership enrollments, 1 doctor profile" — non-zero counts only, in the
 *  order the labels are declared. Empty string when everything is zero. */
export function describeCounts<K extends string>(
  counts: Record<K, number>,
  labels: Record<K, [string, string]>,
): string {
  return (Object.entries(labels) as [K, [string, string]][])
    .map(([key, [one, many]]) => [counts[key] ?? 0, one, many] as const)
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`)
    .join(", ");
}

export type CountryImpactLoad =
  | { status: "loading" }
  | { status: "ready"; impact: CountryDeleteImpact }
  | { status: "missing" }
  | { status: "error"; message: string };

/**
 * Turn the impact endpoint's reply into a load state. A 404 is its own state
 * rather than an error: the country is already gone, so the dialog has nothing
 * to confirm and the delete button must not arm.
 */
export function parseCountryImpactResponse(
  status: number,
  json: { ok?: boolean; message?: string; data?: CountryDeleteImpact } | null,
): CountryImpactLoad {
  if (status === 404) return { status: "missing" };
  if (status < 200 || status >= 300 || !json?.ok || !json.data) {
    return { status: "error", message: json?.message ?? "Could not check linked records." };
  }
  return { status: "ready", impact: json.data };
}

/**
 * Whether the destructive button may fire.
 *
 * Advisory only — the backend recounts every blocker inside the deletion
 * transaction under a row lock and refuses with a 409 regardless of what this
 * returned. It exists so an admin is not offered a button that cannot work,
 * not to be the thing that keeps the data safe.
 *
 * Fails closed on purpose: while the check is in flight, when the country has
 * vanished, and while a submit is already pending. An impact request that
 * ERRORED does arm the button — the server is the authority and will refuse if
 * it must, and a transient network failure should not lock an admin out of a
 * legitimate delete.
 */
export function canConfirmCountryDelete(input: {
  load: CountryImpactLoad;
  typedValue: string;
  requiredValue: string;
  pending: boolean;
}): boolean {
  const { load, typedValue, requiredValue, pending } = input;
  if (pending) return false;
  if (load.status === "loading" || load.status === "missing") return false;
  if (load.status === "ready" && load.impact.blocked) return false;
  return typedValue.trim() === requiredValue;
}
