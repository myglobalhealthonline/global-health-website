import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

type Params = { serviceSlug: string };

export const metadata: Metadata = { title: "Service Page", description: "Service page placeholder." };

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  return <PageShell title={`Service Page: ${serviceSlug}`} message="TODO: Add service-page legacy mapping and content." ctaHref="/book-online" ctaLabel="Book Online" />;
}

