import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "TODO: Add FAQ groups and structured data output.",
};

export default function Page() {
  return (
    <PageShell
      title="Frequently Asked Questions"
      message="TODO: Add FAQ groups and structured data output."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

