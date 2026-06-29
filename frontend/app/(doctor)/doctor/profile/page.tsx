import { redirect } from "next/navigation";
import { fetchDoctorMe } from "@/lib/api/doctor-api";
import { ProfileSections, activeMarkets } from "./_components/profile-sections";

export const dynamic = "force-dynamic";

export default async function DoctorProfilePage() {
  const result = await fetchDoctorMe();
  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
      </div>
    );
  }
  const { doctor } = result.data;
  const markets = activeMarkets(doctor);

  // Multi-country doctors get a dedicated per-country page (and sidebar
  // entry). Send them to their primary country's profile so the base
  // URL never shows an ambiguous "which country?" editor.
  if (markets.length >= 2) {
    const primary =
      markets.find((m) => m.country.slug === doctor.country.slug) ?? markets[0];
    redirect(`/doctor/profile/${primary.country.slug}`);
  }

  return <ProfileSections doctor={doctor} activeMarket={markets[0] ?? null} />;
}
