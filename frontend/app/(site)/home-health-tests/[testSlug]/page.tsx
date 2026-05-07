import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { getPublicServicesNormalized } from "@/lib/content/get-public-services";

type Params = { testSlug: string };

export const metadata: Metadata = {
  title: "Home Health Test",
  description: "Home health test detail and follow-up guidance.",
  robots: {
    index: false,
    follow: true,
  },
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
      bodyHtml={copy.bodyHtml ?? null}
      keyFacts={copy.keyFacts}
      bookingHref="/book-online"
      bookingLabel={copy.bookingLabel ?? "Book Online"}
      imageSrc={copy.imageSrc}
    />
  );
}
