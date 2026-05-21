import "server-only";

import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";

/**
 * Resolve the destination URL for the "Book consultation" CTAs scattered
 * across the patient portal. Previously these all linked to `/` (the
 * country picker), forcing logged-in patients to repick Ireland (or
 * wherever) every single time. We instead read the patient's most
 * recent booking, look up its country slug + default locale, and route
 * them straight into the general-consultation landing for that market.
 *
 * Returns `/` as a graceful fallback when:
 *  - the patient has no bookings yet (first-time CTA)
 *  - the API call fails (offline / DB blip)
 *  - the country has been deactivated since the booking was made
 */
export async function resolveBookConsultationHref(): Promise<string> {
  try {
    const [appointmentsResult, countries] = await Promise.all([
      fetchAccountAppointments(),
      getPublicCountriesMerged(),
    ]);
    if (!appointmentsResult.ok) return "/";
    const lastAppt = appointmentsResult.data.items.find(
      (a) => Boolean(a.countryCode),
    );
    if (!lastAppt) return "/";
    const country = countries.find(
      (c) => c.code.toUpperCase() === lastAppt.countryCode.toUpperCase(),
    );
    if (!country) return "/";
    const lang = country.defaultLocale.toLowerCase();
    return `/${country.slug}/${lang}/general-consultation`;
  } catch {
    return "/";
  }
}
