import type { Metadata } from "next";
import { DoctorProfileTemplate } from "@/components/templates/DoctorProfileTemplate";
import { resolveDoctorProfilePageData } from "@/lib/content/doctor-profile-data";

type DoctorProfileRouteParams = { doctorSlug: string };

export async function buildDoctorProfileMetadata(
  params: Promise<DoctorProfileRouteParams>,
): Promise<Metadata> {
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  return {
    title: `${data.profile.name} | ${data.profile.country} Team`,
    description: `Doctor profile for ${data.profile.name} including specialties, languages, and booking options.`,
  };
}

export async function renderDoctorProfilePage(params: Promise<DoctorProfileRouteParams>) {
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  return <DoctorProfileTemplate {...data} />;
}
