import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Specialist Consultation - Czechia",
  description: "TODO: Add Czechia specialist consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="Specialist Consultation - Czechia"
      message="TODO: Add Czechia specialist consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

