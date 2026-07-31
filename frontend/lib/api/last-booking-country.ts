import "server-only";

import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { countryLinkLocale } from "@/lib/i18n/country-link-locale";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";

/**
 * Resolve the destination URL for the "Book consultation" CTAs scattered
 * across the patient portal. Previously these all linked to `/` (the
 * country picker), forcing logged-in patients to repick Ireland (or
 * wherever) every single time. We instead read the patient's most
 * recent booking, look up its country slug + default locale, and route
 * them straight into the guided booking flow for that market.
 *
 * Returns `/` as a graceful fallback when:
 *  - the patient has no bookings yet (first-time CTA)
 *  - the API call fails (offline / DB blip)
 *  - the country has been deactivated since the booking was made
 *
 * `?from=portal` is appended so the booking wizard can show a "back to my
 * account" return band for patients arriving from the portal (04-001/04-002)
 * — every portal "Book consultation" CTA routes through this one function.
 */
export async function resolveBookConsultationHref(): Promise<string> {
  try {
    const [appointmentsResult, countries, selectedLocale] = await Promise.all([
      fetchAccountAppointments(),
      getPublicCountriesMerged(),
      getPortalLocale(),
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
    // The patient's own language when that market serves it — this href is the
    // portal sidebar's "Book consultation" AND (minus /book) the sidebar logo,
    // so using the country default here is what sent an English-speaking
    // patient to the Portuguese site.
    const lang = countryLinkLocale(selectedLocale, country);
    return `/${country.slug}/${lang}/book?from=portal`;
  } catch {
    return "/";
  }
}
