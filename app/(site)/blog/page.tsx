import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Blog",
  description: "TODO: Add blog listing with categories and search.",
};

export default function Page() {
  return (
    <PageShell
      title="Blog"
      message="TODO: Add blog listing with categories and search."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

