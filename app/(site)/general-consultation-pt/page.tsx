import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "General Consultation - Portugal",
  description: "TODO: Add Portugal general consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="General Consultation - Portugal"
      message="TODO: Add Portugal general consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

