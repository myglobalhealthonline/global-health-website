import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { countries, getCountryByCode } from "@/data/countries";
import { getTemplatePageData } from "@/lib/content/template-page-data";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({ country: COUNTRY_CODE_TO_SLUG[c.code] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!config) return { title: SITE_NAME };

  const title = `${config.name} clinicians · ${SITE_NAME}`;
  const description = `Meet the doctors licensed in ${config.name} and available for online consultations through ${SITE_NAME}.`;
  const url = `${getSiteUrl()}/${country}/team`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryTeamPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();

  const data = await getTemplatePageData(config.teamPath, code);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}` },
          { name: "Clinicians", url: `/${slug}/team` },
        ])}
      />
      <DoctorTeamTemplate
        countryName={config.name}
        doctors={data.doctors.map((d) => ({
          ...d,
          href: `/${slug}/team/${d.href.split("/").pop()}`,
        }))}
        bookingHref={`/${slug}/services`}
        bookingLabel="Book consultation"
      />
    </>
  );
}
