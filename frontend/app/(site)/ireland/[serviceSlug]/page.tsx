import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { getPublicServiceBySlug } from "@/lib/content/get-public-services";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Ireland Consultation",
  description: "Service detail template for Ireland consultation pages.",
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
      bodyHtml={"bodyHtml" in copy ? copy.bodyHtml : null}
      keyFacts={copy.keyFacts}
      bookingHref="/general-consultation-ie"
      bookingLabel={"bookingLabel" in copy && copy.bookingLabel ? copy.bookingLabel : "Book consultation"}
      imageSrc={"imageSrc" in copy ? copy.imageSrc : undefined}
    />
  );
}
