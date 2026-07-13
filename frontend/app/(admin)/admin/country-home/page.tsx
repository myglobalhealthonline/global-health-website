import { redirect } from "next/navigation";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";

/**
 * Sidebar "Country home" shim — resolves the active country from the topbar
 * picker and opens its HOME page-content editor.
 */
export default async function AdminCountryHomeRedirect() {
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const active = await getActiveCountry(countries);
  if (active) {
    redirect(`/admin/page-content/${encodeURIComponent(active.id)}/HOME`);
  }
  redirect("/admin/page-content");
}
