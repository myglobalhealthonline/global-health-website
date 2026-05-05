import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Specialist Consultation - Ireland",
  description: "TODO: Add Ireland specialist consultation overview.",
};

export default function Page() {
  return (
    <PageShell
      title="Specialist Consultation - Ireland"
      message="TODO: Add Ireland specialist consultation overview."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

