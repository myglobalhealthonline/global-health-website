import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Refund Policy Alias",
  description: "TODO: Add redirect to /return-and-refund-policy in middleware/proxy.",
};

export default function Page() {
  return (
    <PageShell
      title="Refund Policy Alias"
      message="TODO: Add redirect to /return-and-refund-policy in middleware/proxy."
      ctaHref="/return-and-refund-policy"
      ctaLabel="Book Online"
    />
  );
}

