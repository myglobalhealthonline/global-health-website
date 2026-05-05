import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "eGift Card",
  description: "TODO: Add gift card product details and purchase flow.",
};

export default function Page() {
  return (
    <PageShell
      title="eGift Card"
      message="TODO: Add gift card product details and purchase flow."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

