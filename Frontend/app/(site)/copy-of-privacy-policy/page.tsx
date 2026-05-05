import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Copy of Privacy Policy",
  description: "TODO: Replace with verified policy content or redirect strategy.",
};

export default function Page() {
  return (
    <PageShell
      title="Copy of Privacy Policy"
      message="TODO: Replace with verified policy content or redirect strategy."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

