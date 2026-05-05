import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description: "TODO: Add pricing cards, comparisons, and eligibility notes.",
};

export default function Page() {
  return (
    <PageShell
      title="Plans & Pricing"
      message="TODO: Add pricing cards, comparisons, and eligibility notes."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

