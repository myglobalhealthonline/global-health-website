import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "General Consultation - Spain",
  description: "TODO: Add Spain general consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="General Consultation - Spain"
      message="TODO: Add Spain general consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

