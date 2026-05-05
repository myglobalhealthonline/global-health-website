import type { Metadata } from "next";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopy } from "@/lib/content/template-page-data";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Service Details",
  description: "Service detail template route.",
};

export default async function ServicesDetailPage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const copy = buildServiceDetailCopy(serviceSlug);
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bookingHref="/book-online"
      bookingLabel="Book Online"
    />
  );
}
