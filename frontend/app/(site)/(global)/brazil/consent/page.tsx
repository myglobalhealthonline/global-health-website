import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { BrazilConsentPageClient } from "./BrazilConsentPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const consent = loadLocaleBundle(locale).home.brazilConsent;
  return buildPublicMetadata({ path: "/brazil/consent", title: consent.headerTitle, description: consent.headerSubtitle, locale, kind: "legal", subtitle: consent.stepConsent, noindex: true });
}

export default async function BrazilConsentPage() {
  const locale = await getPageLocale();
  const { home } = loadLocaleBundle(locale);

  return <BrazilConsentPageClient t={home.brazilConsent} />;
}
