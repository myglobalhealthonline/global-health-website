import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { getPublicServicesNormalized } from "@/lib/content/get-public-services";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Service Page",
  description: "Generic service detail template route.",
};

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const services = await getPublicServicesNormalized();
  const service = services.find((item) => item.slug === serviceSlug);
  if (!service) notFound();

  const mode = service.kind === "SPECIALIST" ? "specialist" : "general";
  const copy = await buildServiceDetailCopyAsync(serviceSlug, mode, service.countryCode);
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bodyHtml={"bodyHtml" in copy ? copy.bodyHtml : null}
      keyFacts={copy.keyFacts}
      bookingHref="/book-online"
      bookingLabel={"bookingLabel" in copy && copy.bookingLabel ? copy.bookingLabel : "Book Online"}
      imageSrc={"imageSrc" in copy ? copy.imageSrc : undefined}
    />
  );
}
