import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Spain Home",
  description: "TODO: Add Spain landing page content blocks.",
};

export default function Page() {
  return (
    <PageShell
      title="Spain Home"
      message="TODO: Add Spain landing page content blocks."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

