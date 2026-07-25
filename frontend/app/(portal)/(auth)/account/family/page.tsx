import type { Metadata } from "next";
import { getServerSubscription } from "@/lib/api/me-subscription-server";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { FamilyPanel } from "./_components/FamilyPanel";

export const metadata: Metadata = { title: "Family members", robots: { index: false } };

export default async function AccountFamilyPage() {
  const [sub, locale] = await Promise.all([getServerSubscription(), getPageLocale()]);
  const { account } = loadLocaleBundle(locale);

  return <FamilyPanel t={account.family} familyEligible={sub?.familyEligible === true} />;
}
