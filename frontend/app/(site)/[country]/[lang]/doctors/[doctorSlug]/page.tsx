import { notFound } from "next/navigation";
import { buildDoctorProfileMetadata, renderDoctorProfilePage } from "@/lib/content/doctor-profile-page";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";

type Params = { country: string; lang: string; doctorSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const p = await params;
  const code = countryCodeFromSlug(p.country);
  if (!code || !isSupportedLocale(p.lang)) return { title: "Global Health" };
  return buildDoctorProfileMetadata(Promise.resolve({ doctorSlug: p.doctorSlug }));
}

export default async function CountryLangDoctorProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, doctorSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code) notFound();
  if (!isSupportedLocale(lang)) notFound();
  return renderDoctorProfilePage(
    Promise.resolve({ doctorSlug, countrySlug: country, lang }),
  );
}
