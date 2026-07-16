import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { BrazilConsentPageClient } from "./BrazilConsentPageClient";

export default async function BrazilConsentPage() {
  const locale = await getPageLocale();
  const { home } = loadLocaleBundle(locale);

  return <BrazilConsentPageClient t={home.brazilConsent} />;
}
