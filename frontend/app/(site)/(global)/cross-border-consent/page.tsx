import type { Metadata } from "next";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { CrossBorderConsentPageClient } from "./CrossBorderConsentPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  return buildPublicMetadata({
    path: "/cross-border-consent",
    title: "Prescription request — your consent",
    description:
      "Review what will be shared with the prescribing doctor and choose how to proceed with your cross-border prescription request.",
    locale,
    kind: "page",
    subtitle: "Secure patient authorization",
    noindex: true,
  });
}

export default async function CrossBorderConsentPage() {
  return <CrossBorderConsentPageClient />;
}
