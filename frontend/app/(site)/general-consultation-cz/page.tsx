import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "General Consultation - Czechia",
  description: "TODO: Add Czechia general consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="General Consultation - Czechia"
      message="TODO: Add Czechia general consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

