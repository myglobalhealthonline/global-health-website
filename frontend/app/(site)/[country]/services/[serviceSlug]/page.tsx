import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCountryByCode } from "@/data/countries";
import { getPublicServiceBySlug } from "@/lib/content/get-public-services";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string; serviceSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, serviceSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code) return { title: SITE_NAME };
  const service = await getPublicServiceBySlug(code, serviceSlug);
  if (!service) return { title: SITE_NAME, robots: { index: false, follow: true } };

  const url = `${getSiteUrl()}/${country}/services/${serviceSlug}`;
  const title = service.seoTitle ?? service.heroTitle ?? service.name;
  const description =
    service.seoDescription ?? service.heroDescription ?? service.summary ?? "Online consultation details.";
  const readyToIndex = service.editorialChecklist?.readyToIndex === true;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
    robots: !readyToIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function CountryServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, serviceSlug } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();

  const service = await getPublicServiceBySlug(code, serviceSlug);
  if (!service) notFound();

  const mode =
    service.kind === "SPECIALIST"
      ? "specialist"
      : service.kind === "PRESCRIPTION"
        ? "prescription"
        : service.kind === "HEALTH_TEST"
          ? "health-test"
          : "general";

  const copy = await buildServiceDetailCopyAsync(serviceSlug, mode, code);
  const bookingHref =
    service.kind === "PRESCRIPTION" ? "/online-prescription" : config.generalConsultationPath;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}` },
          { name: "Services", url: `/${slug}/services` },
          { name: service.name, url: `/${slug}/services/${serviceSlug}` },
        ])}
      />
      <ServiceDetailTemplate
        title={copy.title}
        description={copy.description}
        body={copy.body}
        bodyHtml={copy.bodyHtml ?? null}
        keyFacts={copy.keyFacts}
        bookingHref={bookingHref}
        bookingLabel={copy.bookingLabel ?? "Book Online"}
        imageSrc={copy.imageSrc}
      />
    </>
  );
}
