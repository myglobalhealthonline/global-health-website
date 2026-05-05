import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Specialist Consultation - Spain",
  description: "TODO: Add Spain specialist consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="Specialist Consultation - Spain"
      message="TODO: Add Spain specialist consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

