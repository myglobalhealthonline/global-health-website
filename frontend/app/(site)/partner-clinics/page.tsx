import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Partner Clinics",
  description: "TODO: Add partner network and referral details.",
};

export default function Page() {
  return (
    <PageShell
      title="Partner Clinics"
      message="TODO: Add partner network and referral details."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

