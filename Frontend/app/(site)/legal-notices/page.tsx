import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Legal Notices",
  description: "TODO: Add legal notices content from verified policy source.",
};

export default function Page() {
  return (
    <PageShell
      title="Legal Notices"
      message="TODO: Add legal notices content from verified policy source."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

