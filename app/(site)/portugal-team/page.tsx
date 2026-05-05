import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Portugal Team",
  description: "TODO: Add Portugal team member content.",
};

export default function Page() {
  return (
    <PageShell
      title="Portugal Team"
      message="TODO: Add Portugal team member content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

