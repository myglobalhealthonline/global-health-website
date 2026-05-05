import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

type Params = { testSlug: string };

export const metadata: Metadata = { title: "Home Health Test", description: "Home health test placeholder page." };

export default async function HomeHealthTestPage({ params }: { params: Promise<Params> }) {
  const { testSlug } = await params;
  return <PageShell title={`Home Health Test: ${testSlug}`} message="TODO: Add test detail content and ordering workflow." ctaHref="/home-health-test" ctaLabel="Back to Health Tests" />;
}

