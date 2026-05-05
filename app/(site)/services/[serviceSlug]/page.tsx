import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

type Params = { serviceSlug: string };

export const metadata: Metadata = { title: "Service", description: "Service placeholder page." };

export default async function ServicesPage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  return <PageShell title={`Service: ${serviceSlug}`} message="TODO: Add modern services catalog content." ctaHref="/book-online" ctaLabel="Book Online" />;
}

