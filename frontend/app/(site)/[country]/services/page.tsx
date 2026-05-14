import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
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

  const title = `General consultation · ${config.name} · ${SITE_NAME}`;
  const description = `Online GP consultations in ${config.name}. Prescriptions, sick notes and referrals issued the same day.`;
  const url = `${getSiteUrl()}/${country}/services`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryServicesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();

  const data = await getTemplatePageData(config.generalConsultationPath, code);
  const gc = data.generalConsultation;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}` },
          { name: "General consultation", url: `/${slug}/services` },
        ])}
      />
      <ConsultationListingTemplate
        title={gc.heroTitle}
        description={gc.heroDescription}
        mode="general"
        primaryCtaLabel={gc.primaryCtaLabel}
        secondaryCta={gc.secondaryCta}
        explanation={gc.explanation}
        listing={gc.serviceCards}
        pricing={gc.pricing}
        howItWorks={gc.howItWorks}
        trust={gc.trust}
        faq={gc.faq}
        bookingHref={data.paths.general}
        bookingLabel={gc.primaryCtaLabel}
      />
    </>
  );
}
