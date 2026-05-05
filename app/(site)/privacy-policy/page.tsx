import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy Alias",
  description: "TODO: Add redirect to /privacy in middleware/proxy.",
};

export default function Page() {
  return (
    <PageShell
      title="Privacy Policy Alias"
      message="TODO: Add redirect to /privacy in middleware/proxy."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

