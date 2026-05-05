import type { Metadata } from "next";
import { routeInventory } from "@/data/routes";
import { PageShell } from "@/components/layout/PageShell";
import { notFound } from "next/navigation";

type Params = { serviceSlug: string };
const known = routeInventory.irelandGeneralConsultation.map((p) => p.replace("/ireland/", ""));

export const metadata: Metadata = { title: "Ireland Consultation", description: "Ireland consultation placeholder." };
export function generateStaticParams() { return known.map((serviceSlug) => ({ serviceSlug })); }

export default async function IrelandServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  if (!known.includes(serviceSlug)) notFound();
  return <PageShell title={`Ireland Service: ${serviceSlug}`} message="TODO: Add full Ireland service page content." ctaHref="/general-consultation-ie" ctaLabel="Back to Ireland Consultations" />;
}

