import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomeHero } from "@/components/sections/HomeHero";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { ServiceCatalog } from "@/components/sections/ServiceCatalog";
import { DoctorWall } from "@/components/sections/DoctorWall";
import { HowItWorksNarrative } from "@/components/sections/HowItWorksNarrative";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { countries, getCountryByCode } from "@/data/countries";
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

      {/* Country home sequence — matches website UI kit composition:
          HomeHero → TrustRibbon → ServiceCatalog → DoctorWall →
          HowItWorks → FinalCTA. */}
      <HomeHero countryCode={config.code} countryName={config.name} />
      <TrustRibbon />
      <ServiceCatalog />
      <DoctorWall />
      <HowItWorksNarrative />
      <FinalCTA
        primaryHref={`/${slug}/services`}
        secondaryHref="/plans-pricing"
      />
    </>
  );
}
