import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { AccountSecurityClient } from "./_components/security-client";

export default async function AccountSecurityPage() {
  const locale = await getPageLocale();
  const { account } = loadLocaleBundle(locale);
  return <AccountSecurityClient i18n={account.security} />;
}
