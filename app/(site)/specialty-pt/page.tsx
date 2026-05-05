import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Specialist Consultation - Portugal",
  description: "TODO: Add Portugal specialist consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="Specialist Consultation - Portugal"
      message="TODO: Add Portugal specialist consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

