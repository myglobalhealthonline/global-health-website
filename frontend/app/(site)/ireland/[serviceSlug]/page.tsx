import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { getPublicServiceBySlug } from "@/lib/content/get-public-services";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";

type Params = { serviceSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { serviceSlug } = await params;
  const service = await getPublicServiceBySlug("ie", serviceSlug);
  if (!service || service.kind === "SPECIALIST" || service.kind === "HEALTH_TEST" || service.kind === "HOME_DELIVERY") {
    return {
      title: "Ireland Consultation",
      robots: { index: false, follow: true },
    };
  }
  const readyToIndex = service.editorialChecklist?.readyToIndex === true;
  return {
    title: service.seoTitle ?? service.heroTitle ?? service.name,
    description:
      service.seoDescription ??
      service.heroDescription ??
      service.summary ??
      "Ireland online consultation service details.",
    alternates: {
      canonical: `/ireland/${serviceSlug}`,
    },
    robots: !readyToIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function IrelandServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const service = await getPublicServiceBySlug("ie", serviceSlug);
  if (!service || service.kind === "SPECIALIST" || service.kind === "HEALTH_TEST" || service.kind === "HOME_DELIVERY") notFound();

  const mode = service.kind === "PRESCRIPTION" ? "prescription" : "general";
  const bookingHref =
    service.kind === "PRESCRIPTION"
      ? "/online-prescription"
      : "/general-consultation-ie";
  const bookingLabel = service.ctaLabel ?? (service.kind === "GENERAL" ? "Book consultation" : "Book Online");

  const copy = await buildServiceDetailCopyAsync(serviceSlug, mode, "ie");
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bodyHtml={copy.bodyHtml ?? null}
      keyFacts={copy.keyFacts}
      bookingHref={bookingHref}
      bookingLabel={copy.bookingLabel ?? bookingLabel}
      imageSrc={copy.imageSrc}
    />
  );
}
