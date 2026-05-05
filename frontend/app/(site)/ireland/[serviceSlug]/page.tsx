import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { routeInventory } from "@/data/routes";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";

type Params = { serviceSlug: string };
const known = routeInventory.irelandGeneralConsultation.map((p) => p.replace("/ireland/", ""));

export const metadata: Metadata = {
  title: "Ireland Consultation",
  description: "Service detail template for Ireland consultation pages.",
};

export function generateStaticParams() {
  return known.map((serviceSlug) => ({ serviceSlug }));
}

export default async function IrelandServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  if (!known.includes(serviceSlug)) notFound();

  const copy = await buildServiceDetailCopyAsync(serviceSlug, "general");
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      keyFacts={copy.keyFacts}
      bookingHref="/general-consultation-ie"
      bookingLabel="Book consultation"
    />
  );
}
