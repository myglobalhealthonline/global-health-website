import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Pricing Plans",
  description: "TODO: Add complete plan inventory table and details.",
};

export default function Page() {
  return (
    <PageShell
      title="Pricing Plans"
      message="TODO: Add complete plan inventory table and details."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

