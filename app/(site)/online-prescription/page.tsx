import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Online Prescription",
  description: "TODO: Add eligibility, workflow, and compliance copy.",
};

export default function Page() {
  return (
    <PageShell
      title="Online Prescription"
      message="TODO: Add eligibility, workflow, and compliance copy."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

