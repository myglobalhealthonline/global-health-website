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
import {
  breadcrumbJsonLd,
  medicalBusinessJsonLd,
} from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPublicPage,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-public-page";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  const out: Params[] = [];
  for (const c of countries) {
    const slug = COUNTRY_CODE_TO_SLUG[c.code];
    const defaultLocale = c.defaultLocale?.toLowerCase() ?? "en";
    out.push({ country: slug, lang: defaultLocale });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  if (!code) return { title: SITE_NAME };
  const config = getCountryByCode(code);
  if (!config) return { title: SITE_NAME };
  if (!isSupportedLocale(lang)) return { title: SITE_NAME };

  const page = await getPublicPage(code, "HOME", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}`;
  const title = page?.seoTitle ?? `${config.name} Online Clinic | ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Book a licensed online doctor consultation in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "") },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      ...(page?.ogImage?.src ? { images: [{ url: page.ogImage.src }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryLangHomePage({
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

  const countryUrl = `${getSiteUrl()}/${slug}/${lang}`;

  return (
    <>
      <JsonLd
        data={[
          medicalBusinessJsonLd({ name: config.name, url: countryUrl }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: config.name, url: `/${slug}/${lang}` },
          ]),
        ]}
      />

      <HomeHero countryCode={config.code} countryName={config.name} />
      <TrustRibbon />
      <ServiceCatalog />
      <DoctorWall />
      <HowItWorksNarrative />
      <FinalCTA
        primaryHref={`/${slug}/${lang}/general-consultation`}
        secondaryHref={`/${slug}/${lang}/book-online`}
      />
    </>
  );
}
