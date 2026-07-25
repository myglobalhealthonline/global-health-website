import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { AccessHistoryClient } from "./_components/access-history-client";

export default async function AccessHistoryPage() {
  const locale = await getPageLocale();
  const { account } = loadLocaleBundle(locale);
  return <AccessHistoryClient i18n={account.accessHistory} />;
}
