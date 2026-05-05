import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Home Delivery",
  description: "TODO: Add home delivery service scope and timelines.",
};

export default function Page() {
  return (
    <PageShell
      title="Home Delivery"
      message="TODO: Add home delivery service scope and timelines."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

