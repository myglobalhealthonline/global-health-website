import type { Metadata } from "next";
import { DoctorProfileTemplate } from "@/components/templates/DoctorProfileTemplate";
import { getDoctorProfileData } from "@/lib/content/doctor-profile-data";

type Params = { doctorSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { doctorSlug } = await params;
  const data = getDoctorProfileData(doctorSlug);
  return {
    title: `${data.profile.name} | Ireland Team`,
    description: `Doctor profile for ${data.profile.name} including specialties, languages, and booking options.`,
  };
}

export default async function DoctorPage({ params }: { params: Promise<Params> }) {
  const { doctorSlug } = await params;
  const data = getDoctorProfileData(doctorSlug);
  return <DoctorProfileTemplate {...data} />;
}
