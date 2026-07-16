import Link from "next/link";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
