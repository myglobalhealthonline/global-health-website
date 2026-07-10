import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { AccountProfileClient } from "./_components/profile-client";

export default async function AccountProfilePage() {
  const locale = await getPageLocale();
  const { account } = loadLocaleBundle(locale);
  return (
    <AccountProfileClient
      i18n={{
        profile: account.profile,
        insurance: account.insurance,
        verification: account.verification,
        nationality: account.nationality,
        privacy: account.privacy,
      }}
    />
  );
}
