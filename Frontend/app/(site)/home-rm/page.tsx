import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Romania Home",
  description: "TODO: Add Romania landing page content blocks.",
};

export default function Page() {
  return (
    <PageShell
      title="Romania Home"
      message="TODO: Add Romania landing page content blocks."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

