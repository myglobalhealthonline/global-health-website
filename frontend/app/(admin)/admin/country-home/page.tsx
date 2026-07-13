import { redirect } from "next/navigation";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";

/**
 * Legacy "/admin/country-home" shim. The homepage is no longer managed through
 * the structured page-content CMS (HOME + DOCTORS_INDEX were removed), so this
 * just lands on the page-content overview, scoped to the active country when one
 * is selected.
 */
export default async function AdminCountryHomeRedirect() {
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const active = await getActiveCountry(countries);
  if (active) {
    redirect(`/admin/page-content?countryId=${encodeURIComponent(active.id)}`);
  }
  redirect("/admin/page-content");
}
