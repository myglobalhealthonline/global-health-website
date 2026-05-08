import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { getPublicServiceBySlug } from "@/lib/content/get-public-services";

type Params = { serviceSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { serviceSlug } = await params;
  const service = await getPublicServiceBySlug("ie", serviceSlug);
  if (!service || service.kind !== "SPECIALIST") {
    return {
      title: "Ireland Specialist Consultation",
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
      "Ireland specialist consultation service details.",
    alternates: {
      canonical: `/ireland-specialist-consultations/${serviceSlug}`,
    },
    robots: !readyToIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function IrelandSpecialistServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const service = await getPublicServiceBySlug("ie", serviceSlug);
  if (!service || service.kind !== "SPECIALIST") notFound();

  const copy = await buildServiceDetailCopyAsync(serviceSlug, "specialist", "ie");
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bodyHtml={copy.bodyHtml ?? null}
      keyFacts={copy.keyFacts}
      bookingHref="/specialty-ie"
      bookingLabel={copy.bookingLabel ?? "Book Online"}
      imageSrc={copy.imageSrc}
    />
  );
}
