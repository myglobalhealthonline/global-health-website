import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Czechia Home",
  description: "TODO: Add Czechia landing page content blocks.",
};

export default function Page() {
  return (
    <PageShell
      title="Czechia Home"
      message="TODO: Add Czechia landing page content blocks."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

