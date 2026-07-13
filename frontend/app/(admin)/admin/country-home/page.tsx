import { redirect } from "next/navigation";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";

/**
 * Sidebar entry "Country home" — country-scoped homepage editor.
 *
 * Resolves the active country from the topbar picker cookie and redirects to
 * the Pages list pre-filtered to (countryId, pageKey=HOME). When no country
 * is selected, falls back to a global HOME view so the user still sees rows.
 */
export default async function AdminCountryHomeRedirect() {
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const active = await getActiveCountry(countries);
  if (active) {
    redirect(`/admin/page-content/${encodeURIComponent(active.id)}/HOME`);
  }
  redirect("/admin/page-content?pageKey=HOME");
}
