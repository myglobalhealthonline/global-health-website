import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { routeInventory } from "@/data/routes";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";

type Params = { serviceSlug: string };
const known = routeInventory.irelandSpecialistConsultation.map((p) =>
  p.replace("/ireland-specialist-consultations/", ""),
);

export const metadata: Metadata = {
  title: "Ireland Specialist Consultation",
  description: "Service detail template for Ireland specialist pages.",
};

export function generateStaticParams() {
  return known.map((serviceSlug) => ({ serviceSlug }));
}

export default async function IrelandSpecialistServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  if (!known.includes(serviceSlug)) notFound();

  const copy = await buildServiceDetailCopyAsync(serviceSlug, "specialist");
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      keyFacts={copy.keyFacts}
      bookingHref="/specialty-ie"
      bookingLabel="Book Online"
    />
  );
}
