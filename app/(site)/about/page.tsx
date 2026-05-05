import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "About Global Health",
  description: "TODO: Add clinic story, mission, and team overview content.",
};

export default function Page() {
  return (
    <PageShell
      title="About Global Health"
      message="TODO: Add clinic story, mission, and team overview content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

