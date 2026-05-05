import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "TODO: Add privacy and GDPR policy content.",
};

export default function Page() {
  return (
    <PageShell
      title="Privacy Policy"
      message="TODO: Add privacy and GDPR policy content."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

