import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Refund and Return Policy",
  description: "TODO: Add refund and return policy content.",
};

export default function Page() {
  return (
    <PageShell
      title="Refund and Return Policy"
      message="TODO: Add refund and return policy content."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

