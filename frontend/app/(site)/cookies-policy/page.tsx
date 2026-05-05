import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description: "TODO: Add cookies policy content and consent references.",
};

export default function Page() {
  return (
    <PageShell
      title="Cookies Policy"
      message="TODO: Add cookies policy content and consent references."
      ctaHref="/privacy"
      ctaLabel="Book Online"
    />
  );
}

