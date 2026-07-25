import { redirect } from "next/navigation";

/**
 * A bare /admin/page-content/[countryId] URL (no pageKey segment) has no
 * matching route under [countryId]/[pageKey] and 404s. Redirect to the
 * overview list pre-filtered to this country instead of a dead end.
 */
export default async function AdminPageContentCountryRedirect({
  params,
}: {
  params: Promise<{ countryId: string }>;
}) {
  const { countryId } = await params;
  redirect(`/admin/page-content?countryId=${encodeURIComponent(countryId)}`);
}
