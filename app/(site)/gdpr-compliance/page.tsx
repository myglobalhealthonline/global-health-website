import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "GDPR Compliance",
  description: "TODO: Add GDPR compliance details and data rights process.",
};

export default function Page() {
  return (
    <PageShell
      title="GDPR Compliance"
      message="TODO: Add GDPR compliance details and data rights process."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

