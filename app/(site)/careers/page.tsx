import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Careers",
  description: "TODO: Add open roles and hiring process details.",
};

export default function Page() {
  return (
    <PageShell
      title="Careers"
      message="TODO: Add open roles and hiring process details."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

