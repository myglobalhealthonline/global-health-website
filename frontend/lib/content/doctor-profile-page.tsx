import type { Metadata } from "next";
import { DoctorProfileTemplate } from "@/components/templates/DoctorProfileTemplate";
import { resolveDoctorProfilePageData } from "@/lib/content/doctor-profile-data";
import { validatePublicDoctorRecord } from "@/lib/content/publication-validation";

type DoctorProfileRouteParams = { doctorSlug: string };

export async function buildDoctorProfileMetadata(
  params: Promise<DoctorProfileRouteParams>,
): Promise<Metadata> {
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  const validation = validatePublicDoctorRecord({
    fullName: data.profile.name,
    title: data.profile.title,
    bio: data.profile.bio,
    languages: data.profile.languages,
    specialties: data.profile.specialties,
    imcRegistration: data.profile.imcRegistration,
    medicalRegistrationUrl: data.profile.medicalRegistrationUrl,
    qualifications: data.profile.qualifications,
  });
  return {
    title: `${data.profile.name} | ${data.profile.country} Team`,
    description: `Doctor profile for ${data.profile.name} including specialties, languages, and booking options.`,
    alternates: {
      canonical: `${data.hero.secondaryCta?.href ?? "/ireland-team"}/${doctorSlug}`.replace(/([^:]\/)\/+/g, "$1"),
    },
    robots: validation.shouldNoindex ? { index: false, follow: true } : undefined,
  };
}

export async function renderDoctorProfilePage(params: Promise<DoctorProfileRouteParams>) {
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  return <DoctorProfileTemplate {...data} />;
}
