import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { routeInventory } from "@/data/routes";
import { buildServiceDetailCopy } from "@/lib/content/template-page-data";

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

  const copy = buildServiceDetailCopy(serviceSlug);
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bookingHref="/general-consultation-ie"
      bookingLabel="Book Online"
    />
  );
}
