import { notFound } from "next/navigation";
import { buildDoctorProfileMetadata, renderDoctorProfilePage } from "@/lib/content/doctor-profile-page";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";

type Params = { country: string; doctorSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const p = await params;
  const code = countryCodeFromSlug(p.country);
  if (!code) return { title: "Global Health" };
  return buildDoctorProfileMetadata(Promise.resolve({ doctorSlug: p.doctorSlug }));
}

export default async function CountryDoctorProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, doctorSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code) notFound();
  return renderDoctorProfilePage(Promise.resolve({ doctorSlug }));
}
