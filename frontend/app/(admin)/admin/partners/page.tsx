import { redirect } from "next/navigation";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";

export const dynamic = "force-dynamic";

/**
 * Partner management moved into the per-country admin
 * (/admin/countries/[id]/partners) — partners are country-scoped, so they now
 * live alongside Legal / Authority links instead of a standalone top-level page.
 * This route redirects to the active country's partners (or the country list).
 */
export default async function AdminPartnersRedirect() {
  const res = await fetchAdminCountries();
  const countries = res.ok ? res.data.countries : [];
  const active = await getActiveCountry(countries);
  redirect(active ? `/admin/countries/${active.id}/partners` : "/admin/countries");
}
