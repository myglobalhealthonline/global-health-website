import type { Metadata } from "next";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { CrossBorderMoreInfoPageClient } from "./CrossBorderMoreInfoPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  return buildPublicMetadata({
    path: "/cross-border-more-info",
    title: "Cross-border prescription — more information requested",
    description: "Answer the prescribing doctor's question about this prescription request.",
    locale,
    kind: "page",
    subtitle: "Doctor response",
    noindex: true,
  });
}

export default function CrossBorderMoreInfoPage() {
  return <CrossBorderMoreInfoPageClient />;
}
