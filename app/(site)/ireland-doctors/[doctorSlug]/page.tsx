import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

type Params = { doctorSlug: string };

export const metadata: Metadata = { title: "Doctor Profile", description: "Doctor profile placeholder page." };

export default async function DoctorPage({ params }: { params: Promise<Params> }) {
  const { doctorSlug } = await params;
  return <PageShell title={`Doctor: ${doctorSlug}`} message="TODO: Add doctor profile details and booking CTA." ctaHref="/ireland-team" ctaLabel="Back to Team" />;
}

