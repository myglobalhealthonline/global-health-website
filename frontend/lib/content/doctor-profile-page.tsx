import type { Metadata } from "next";
import { DoctorProfileTemplate } from "@/components/templates/DoctorProfileTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveDoctorProfilePageData } from "@/lib/content/doctor-profile-data";
import { validatePublicDoctorRecord } from "@/lib/content/publication-validation";
import { getSiteUrl } from "@/lib/seo/site-url";
import {
  breadcrumbJsonLd,
  physicianJsonLd,
} from "@/lib/seo/structured-data";
import { SITE_NAME } from "@/lib/constants";

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
  // Canonical lives at the new `/{country}/team/[doctorSlug]` URL.
  const countryNameToSlug: Record<string, string> = {
    Ireland: "ireland",
    Portugal: "portugal",
    Spain: "spain",
    Czechia: "czechia",
    Romania: "romania",
  };
  const slug = countryNameToSlug[data.profile.country] ?? "ireland";
  const canonical = `/${slug}/team/${doctorSlug}`;
  const url = `${getSiteUrl()}${canonical}`;
  const title =
    data.profile.seoTitle ?? `${data.profile.name} · ${data.profile.title} · ${data.profile.country}`;
  const description =
    data.profile.seoDescription ??
    `Book an online consultation with ${data.profile.name}, ${data.profile.title} in ${data.profile.country}. Languages: ${data.profile.languages.join(", ") || "English"}.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      title,
      description,
      url,
    },
    twitter: { card: "summary_large_image", title, description },
    robots:
      validation.shouldNoindex || data.profile.editorialChecklist?.readyToIndex !== true
        ? { index: false, follow: true }
        : undefined,
  };
}

export async function renderDoctorProfilePage(params: Promise<DoctorProfileRouteParams>) {
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  const countryNameToSlug: Record<string, string> = {
    Ireland: "ireland",
    Portugal: "portugal",
    Spain: "spain",
    Czechia: "czechia",
    Romania: "romania",
  };
  const slug = countryNameToSlug[data.profile.country] ?? "ireland";
  const teamHref = `/${slug}/team`;
  const profileHref = `${teamHref}/${doctorSlug}`;
  // Override secondaryCta so the "Back" link on the template uses the new URL.
  const templateData = {
    ...data,
    hero: {
      ...data.hero,
      secondaryCta: {
        label: `Back to ${data.profile.country} clinicians`,
        href: teamHref,
      },
    },
  };
  return (
    <>
      <JsonLd
        data={[
          physicianJsonLd({
            name: data.profile.name,
            title: data.profile.title,
            countryName: data.profile.country,
            url: profileHref,
            imageSrc: data.profileImageSrc,
            languages: data.profile.languages,
          }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: data.profile.country, url: teamHref },
            { name: data.profile.name, url: profileHref },
          ]),
        ]}
      />
      <DoctorProfileTemplate {...templateData} />
    </>
  );
}
