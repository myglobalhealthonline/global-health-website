import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "General Consultation - Ireland",
  description: "TODO: Add Ireland general consultation entry content.",
};

export default function Page() {
  return (
    <PageShell
      title="General Consultation - Ireland"
      message="TODO: Add Ireland general consultation entry content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

