import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { getPublicServicesNormalized } from "@/lib/content/get-public-services";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Service Details",
  description: "Service detail template route.",
};

export default async function ServicesDetailPage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const services = await getPublicServicesNormalized();

  const exact = services.find((item) => item.slug === serviceSlug);
  const prefixed = services.find((item) => `${item.countryCode}-${item.slug}` === serviceSlug);
  const service = prefixed ?? exact;
  if (!service) notFound();

  const mode = service.kind === "SPECIALIST" ? "specialist" : "general";
  const copy = await buildServiceDetailCopyAsync(service.slug, mode, service.countryCode);
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
