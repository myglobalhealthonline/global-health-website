import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "General Consultation - Romania",
  description: "TODO: Add Romania general consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="General Consultation - Romania"
      message="TODO: Add Romania general consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

