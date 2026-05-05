import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Terms and Conditions Alias",
  description: "TODO: Add redirect to /term-and-conditions in middleware/proxy.",
};

export default function Page() {
  return (
    <PageShell
      title="Terms and Conditions Alias"
      message="TODO: Add redirect to /term-and-conditions in middleware/proxy."
      ctaHref="/term-and-conditions"
      ctaLabel="Book Online"
    />
  );
}

