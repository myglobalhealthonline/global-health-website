import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Czechia Team",
  description: "TODO: Add Czechia team member content.",
};

export default function Page() {
  return (
    <PageShell
      title="Czechia Team"
      message="TODO: Add Czechia team member content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

