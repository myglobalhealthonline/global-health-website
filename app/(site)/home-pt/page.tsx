import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Portugal Home",
  description: "TODO: Add Portugal landing page content blocks.",
};

export default function Page() {
  return (
    <PageShell
      title="Portugal Home"
      message="TODO: Add Portugal landing page content blocks."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

