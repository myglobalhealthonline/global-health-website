import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { countries, getCountryByCode } from "@/data/countries";
import { getCountryDoctors } from "@/lib/content/get-country-collections";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPublicPage,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-public-page";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({
    country: COUNTRY_CODE_TO_SLUG[c.code],
    lang: (c.defaultLocale ?? "EN").toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const page = await getPublicPage(code, "DOCTORS_INDEX", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/doctors`;
  const title = page?.seoTitle ?? `${config.name} doctors · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Meet the doctors licensed in ${config.name} and available for online consultations.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/doctors") },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryLangDoctorsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const [doctors, page] = await Promise.all([
    getCountryDoctors(code),
    getPublicPage(code, "DOCTORS_INDEX", lang as PublicLocale),
  ]);

  const doctorCards = doctors.map((d) => ({
    name: d.fullName,
    title: d.title,
    imcRegistration: d.imcRegistration,
    medicalRegistrationUrl: d.medicalRegistrationUrl,
    languages: d.languages,
    whatsappNumber: d.whatsappNumber,
    bio: d.bio ?? `Licensed clinician available for online consultations in ${config.name}.`,
    imageSrc: d.imageSrc,
    href: `/${slug}/${lang}/doctors/${d.slug}`,
    ctaLabel: "View profile",
  }));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Doctors", url: `/${slug}/${lang}/doctors` },
        ])}
      />
      <DoctorTeamTemplate
        countryName={config.name}
        doctors={doctorCards}
        bookingHref={`/${slug}/${lang}/general-consultation`}
        bookingLabel="Browse consultations"
      />
      <RichBodySection html={page?.body} />
    </>
  );
}
