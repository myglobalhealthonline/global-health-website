import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryEditorialTemplate } from "@/components/templates/CountryEditorialTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { countries, getCountryByCode } from "@/data/countries";
import { getTemplatePageData } from "@/lib/content/template-page-data";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { pageMetadata } from "@/lib/seo/page-seo";
import {
  breadcrumbJsonLd,
  medicalBusinessJsonLd,
} from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";

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
  if (!code) return { title: "Global Health" };
  return pageMetadata(`/${country}`);
}

export default async function CountryHomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();

  const data = await getTemplatePageData(config.legacyHomePath, code);
  const countryUrl = `${getSiteUrl()}/${slug}`;

  return (
    <>
      <JsonLd
        data={[
          medicalBusinessJsonLd({ name: config.name, url: countryUrl }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: config.name, url: `/${slug}` },
          ]),
        ]}
      />
      <CountryEditorialTemplate
        country={config}
        generalListing={data.generalListing}
        specialistListing={data.specialistListing}
        doctors={data.doctors.map((d) => ({
          name: d.name,
          title: d.title ?? null,
          imageSrc: d.imageSrc,
          href: d.href,
          languages: d.languages,
        }))}
        steps={data.countryHome.steps.map((s) => ({
          title: s.title,
          description: s.description,
        }))}
        paths={data.paths}
      />
    </>
  );
}
