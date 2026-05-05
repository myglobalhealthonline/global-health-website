import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Spain Team",
  description: "TODO: Add Spain team member content.",
};

export default function Page() {
  return (
    <PageShell
      title="Spain Team"
      message="TODO: Add Spain team member content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

