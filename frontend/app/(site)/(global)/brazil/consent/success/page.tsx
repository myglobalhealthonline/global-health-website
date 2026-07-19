import Link from "next/link";
import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const consent = loadLocaleBundle(locale).home.brazilConsent;
  return buildPublicMetadata({ path: "/brazil/consent/success", title: consent.successTitle, description: consent.successBody, locale, kind: "legal", subtitle: consent.thankYouTitle, noindex: true });
}

export default async function BrazilConsentSuccessPage() {
  const locale = await getPageLocale();
  const { home } = loadLocaleBundle(locale);
  const t = home.brazilConsent;

  return (
    <GH2StatusPage
      status="success"
      title={t.successTitle}
      body={t.successBody}
    >
      <Link href="/" className="gh2-btn-lime">
        {t.backToHome}
      </Link>
    </GH2StatusPage>
  );
}
