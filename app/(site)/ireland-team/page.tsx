import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Ireland Team",
  description: "TODO: Add Ireland clinicians and credentials.",
};

export default function Page() {
  return (
    <PageShell
      title="Ireland Team"
      message="TODO: Add Ireland clinicians and credentials."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

