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

  const title = `Specialist consultations · ${config.name} · ${SITE_NAME}`;
  const description = `Cardiology, dermatology, mental health and more — consultants licensed in ${config.name}, available online.`;
  const url = `${getSiteUrl()}/${country}/specialists`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountrySpecialistsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();

  const data = await getTemplatePageData(config.specialistPath, code);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}` },
          { name: "Specialists", url: `/${slug}/specialists` },
        ])}
      />
      <ConsultationListingTemplate
        title={`Specialist consultations in ${config.name}`}
        description={`Focused expertise across cardiology, dermatology, mental health and more — booked the same way you book a GP.`}
        mode="specialist"
        primaryCtaLabel="Start specialist consultation"
        secondaryCta={{ label: "Meet doctors", href: `/${slug}/team` }}
        explanation={{
          title: "When to choose a specialist",
          body: "Specialist consultations are suitable when you need focused medical expertise, follow-up review after lab work, or guidance on complex concerns.",
        }}
        listing={data.specialistListing}
        howItWorks={{
          title: "Book in three steps",
          subtitle: "Simple specialist booking",
          steps: [
            { title: "Choose specialty", description: "Browse available specialist categories below." },
            { title: "Pick a time", description: "Select a slot that fits your week and confirm." },
            { title: "Attend the consultation", description: "Join securely and receive next-step guidance." },
          ],
        }}
        trust={{
          title: "Specialist care you can trust",
          subtitle: "Why patients choose us",
          items: [
            { title: "Licensed consultants", description: "Each specialist is verified and registered." },
            { title: "Private intake", description: "Privacy-first from booking through follow-up." },
            { title: "Actionable plans", description: "Every consultation ends with a clear next step." },
          ],
        }}
        bookingHref={data.paths.specialist}
        bookingLabel="Start specialist consultation"
      />
    </>
  );
}
