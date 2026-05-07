import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { getPublicServiceBySlug } from "@/lib/content/get-public-services";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Ireland Specialist Consultation",
  description: "Service detail template for Ireland specialist pages.",
};

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
      bodyHtml={"bodyHtml" in copy ? copy.bodyHtml : null}
      keyFacts={copy.keyFacts}
      bookingHref="/specialty-ie"
      bookingLabel={"bookingLabel" in copy && copy.bookingLabel ? copy.bookingLabel : "Book Online"}
      imageSrc={"imageSrc" in copy ? copy.imageSrc : undefined}
    />
  );
}
