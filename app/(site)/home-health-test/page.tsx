import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Home Health Test",
  description: "TODO: Add available tests and ordering guidance.",
};

export default function Page() {
  return (
    <PageShell
      title="Home Health Test"
      message="TODO: Add available tests and ordering guidance."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

