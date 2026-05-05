import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Corporate Plans",
  description: "TODO: Add corporate plans and enterprise workflow content.",
};

export default function Page() {
  return (
    <PageShell
      title="Corporate Plans"
      message="TODO: Add corporate plans and enterprise workflow content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

