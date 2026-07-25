import { redirect } from "next/navigation";

/**
 * Legacy per-country profile route. The profile editor is now one page
 * with tabs (`/doctor/profile?tab=<country-slug>`) — redirect old deep
 * links so bookmarks / external links keep working.
 */
export default async function DoctorCountryProfileRedirect({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  redirect(`/doctor/profile?tab=${encodeURIComponent(country)}`);
}
