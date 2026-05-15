import { redirect } from "next/navigation";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";

/**
 * Sidebar entry "Country content" — manages all content pages for the active
 * country (Doctors index intro, General consultation copy, Specialist
 * consultation copy, plus the home itself).
 *
 * Phase 1 redirects into the unified Pages list pre-filtered to the active
 * country. When no country is selected, falls back to the global list so the
 * user can pick a country there.
 */
export default async function AdminCountryContentRedirect() {
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const active = await getActiveCountry(countries);
  if (active) {
    redirect(`/admin/pages?countryId=${encodeURIComponent(active.id)}`);
  }
  redirect("/admin/pages");
}
