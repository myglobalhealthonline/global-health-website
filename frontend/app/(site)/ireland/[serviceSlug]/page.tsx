import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { getPublicServiceBySlug } from "@/lib/content/get-public-services";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { validatePublicServiceRecord } from "@/lib/content/publication-validation";

type Params = { serviceSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { serviceSlug } = await params;
  const service = await getPublicServiceBySlug("ie", serviceSlug);
  if (!service || service.kind !== "GENERAL") {
    return {
      title: "Ireland Consultation",
      robots: { index: false, follow: true },
    };
  }
  const validation = validatePublicServiceRecord(service);
  return {
    title: service.heroTitle ?? service.name,
    description: service.heroDescription ?? service.summary ?? "Ireland online consultation service details.",
    alternates: {
      canonical: `/ireland/${serviceSlug}`,
    },
    robots: validation.shouldNoindex ? { index: false, follow: true } : undefined,
  };
}

export default async function IrelandServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const service = await getPublicServiceBySlug("ie", serviceSlug);
  if (!service || service.kind !== "GENERAL") notFound();

  const copy = await buildServiceDetailCopyAsync(serviceSlug, "general", "ie");
  const validation = validatePublicServiceRecord(service);
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bodyHtml={copy.bodyHtml ?? null}
      keyFacts={copy.keyFacts}
      bookingHref="/general-consultation-ie"
      bookingLabel={copy.bookingLabel ?? "Book consultation"}
      imageSrc={copy.imageSrc}
      editorialNotice={
        validation.requiresEditorialReview
          ? "This service page is under clinical editorial review. Booking remains available, but public indexing is disabled until the service copy is fully reviewed."
          : null
      }
    />
  );
}
