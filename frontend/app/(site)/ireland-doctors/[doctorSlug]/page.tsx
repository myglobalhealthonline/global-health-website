import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";

type Params = { doctorSlug: string };

export const metadata: Metadata = {
  title: "Doctor Profile",
  description: "Template-driven doctor profile placeholder.",
};

function toLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DoctorPage({ params }: { params: Promise<Params> }) {
  const { doctorSlug } = await params;

  return (
    <StaticMarketingTemplate
      hero={{
        title: `Doctor: ${toLabel(doctorSlug)}`,
        description: "Doctor profile placeholder powered by shared static marketing template.",
        primaryCta: { label: "Back to team", href: "/ireland-team" },
        secondaryCta: { label: "Book consultation", href: "/book-online" },
      }}
      intro={{
        title: "Profile content pending",
        body: "TODO: Replace with doctor-specific data from structured adapters/backend.",
      }}
      bottomCta={{
        title: "Need an appointment?",
        description: "Book a consultation and our team will coordinate the right clinician.",
        ctaLabel: "Book consultation",
        ctaHref: "/book-online",
      }}
    />
  );
}
