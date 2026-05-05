import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Ireland Home",
  description: "TODO: Add Ireland landing page content blocks and localized clinic messaging.",
};

export default function Page() {
  return (
    <PageShell
      title="Ireland Home"
      message="TODO: Add Ireland landing page content blocks and localized clinic messaging."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

