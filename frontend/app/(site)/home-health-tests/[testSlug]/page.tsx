import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { getPublicServicesNormalized } from "@/lib/content/get-public-services";

type Params = { testSlug: string };

export const metadata: Metadata = {
  title: "Home Health Test",
  description: "Health test detail route backed by admin services.",
};

export default async function HomeHealthTestPage({ params }: { params: Promise<Params> }) {
  const { testSlug } = await params;
  const services = await getPublicServicesNormalized();
  const service = services.find((item) => item.kind === "HEALTH_TEST" && item.slug === testSlug);
  if (!service) notFound();

  const copy = await buildServiceDetailCopyAsync(testSlug, "general", service.countryCode);
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bodyHtml={"bodyHtml" in copy ? copy.bodyHtml : null}
      keyFacts={"keyFacts" in copy ? copy.keyFacts : undefined}
      bookingHref="/book-online"
      bookingLabel={"bookingLabel" in copy && copy.bookingLabel ? copy.bookingLabel : "Book Online"}
      imageSrc={"imageSrc" in copy ? copy.imageSrc : undefined}
    />
  );
}
