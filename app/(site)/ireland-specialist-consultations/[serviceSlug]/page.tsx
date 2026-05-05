import type { Metadata } from "next";
import { routeInventory } from "@/data/routes";
import { PageShell } from "@/components/layout/PageShell";
import { notFound } from "next/navigation";

type Params = { serviceSlug: string };
const known = routeInventory.irelandSpecialistConsultation.map((p) => p.replace("/ireland-specialist-consultations/", ""));

export const metadata: Metadata = { title: "Ireland Specialist Consultation", description: "Ireland specialist consultation placeholder." };
export function generateStaticParams() { return known.map((serviceSlug) => ({ serviceSlug })); }

export default async function IrelandSpecialistPage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  if (!known.includes(serviceSlug)) notFound();
  return <PageShell title={`Ireland Specialist: ${serviceSlug}`} message="TODO: Add specialist consultation service content." ctaHref="/specialty-ie" ctaLabel="Back to Specialist Consultations" />;
}

