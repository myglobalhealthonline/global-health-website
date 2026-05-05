import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Specialist Consultation - Romania",
  description: "TODO: Add Romania specialist consultation content.",
};

export default function Page() {
  return (
    <PageShell
      title="Specialist Consultation - Romania"
      message="TODO: Add Romania specialist consultation content."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

