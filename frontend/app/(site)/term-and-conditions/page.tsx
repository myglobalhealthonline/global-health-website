import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "TODO: Add full terms and conditions content.",
};

export default function Page() {
  return (
    <PageShell
      title="Terms and Conditions"
      message="TODO: Add full terms and conditions content."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

