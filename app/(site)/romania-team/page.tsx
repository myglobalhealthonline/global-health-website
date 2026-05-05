import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Romania Team",
  description: "TODO: Add Romania team member content.",
};

export default function Page() {
  return (
    <PageShell
      title="Romania Team"
      message="TODO: Add Romania team member content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

