import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Book Online",
  description: "TODO: Implement booking flow form, validation, and success states.",
};

export default function Page() {
  return (
    <PageShell
      title="Book Online"
      message="TODO: Implement booking flow form, validation, and success states."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

