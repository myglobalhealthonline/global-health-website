import { notFound } from "next/navigation";
import { fetchDoctorMe } from "@/lib/api/doctor-api";
import { ProfileSections, activeMarkets } from "../_components/profile-sections";

export const dynamic = "force-dynamic";

export default async function DoctorCountryProfilePage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
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
  const market = activeMarkets(doctor).find(
    (m) => m.country.slug.toLowerCase() === country.toLowerCase(),
  );
  if (!market) notFound();

  return <ProfileSections doctor={doctor} activeMarket={market} />;
}
