import type { Metadata } from "next";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopy } from "@/lib/content/template-page-data";

type Params = { testSlug: string };

export const metadata: Metadata = {
  title: "Home Health Test",
  description: "Health test detail template route.",
};

export default async function HomeHealthTestPage({ params }: { params: Promise<Params> }) {
  const { testSlug } = await params;
  const copy = buildServiceDetailCopy(testSlug);
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
