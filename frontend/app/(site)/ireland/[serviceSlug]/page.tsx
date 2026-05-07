import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { getPublicServiceBySlug } from "@/lib/content/get-public-services";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Ireland Consultation",
  description: "Ireland online consultation service details.",
};

export default async function IrelandServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const service = await getPublicServiceBySlug("ie", serviceSlug);
  if (!service || service.kind !== "GENERAL") notFound();

  const copy = await buildServiceDetailCopyAsync(serviceSlug, "general", "ie");
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
    />
  );
}
