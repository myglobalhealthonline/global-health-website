import type { Metadata } from "next";
import { DoctorProfileTemplate } from "@/components/templates/DoctorProfileTemplate";
import { resolveDoctorProfilePageData } from "@/lib/content/doctor-profile-data";

type Params = { doctorSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  return {
    title: `${data.profile.name} | Ireland Team`,
    description: `Doctor profile for ${data.profile.name} including specialties, languages, and booking options.`,
  };
}

export default async function DoctorPage({ params }: { params: Promise<Params> }) {
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  return <DoctorProfileTemplate {...data} />;
}
