import type { Metadata } from "next";
import Link from "next/link";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  getServerCredits,
  getServerRedemptions,
  getServerSubscription,
} from "@/lib/api/me-subscription-server";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { PageHeader } from "@/components/portal-atoms";
import { RewardsPanel } from "./_components/RewardsPanel";

export const metadata: Metadata = { title: "Wellness rewards", robots: { index: false } };

type Search = { redemption?: string };

export default async function RewardsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ redemption: returnState }, sub, redemptions, credits, user, locale] = await Promise.all([
    searchParams,
    getServerSubscription(),
    getServerRedemptions(),
    getServerCredits(),
    getServerAuthUser(),
    getPageLocale(),
  ]);
  const { subscription } = loadLocaleBundle(locale);
  const t = subscription.redeem;

  const kits = redemptions?.kits ?? [];

  if (!sub || kits.length === 0) {
    return (
      <div className="gh-patient-page gh-patient-rewards-page">
        <PageHeader title={t.title} description={t.subtitle} />
        <div className="gh-patient-empty-state gh-card max-w-xl p-8 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {subscription.dashboard.wellnessNone}
          </p>
          <Link href="/account" className="gh-btn gh-btn-primary mt-6 inline-flex justify-center">
            {subscription.dashboard.manage}
          </Link>
        </div>
      </div>
    );
  }

  // Per-kit "unlocks after N paid months" comes from the live plan rules
  // (data-driven) so a NOT_ELIGIBLE kit can show a real condition.
  const plans = sub.countryCode ? await getCountryPlans(sub.countryCode, locale) : [];
  const livePlan = plans.find((p) => p.id === sub.plan?.id);
  const unlockByKit = new Map(
    (livePlan?.wellnessKits ?? []).map((k) => [k.healthTestId, k.unlockAfterPaidMonths]),
  );
  const kitsWithUnlock = kits.map((k) => ({
    ...k,
    unlockMonths: unlockByKit.get(k.healthTestId) ?? null,
  }));

  return (
    <div className="gh-patient-page gh-patient-rewards-page">
      <PageHeader title={t.title} description={t.subtitle} />
      <RewardsPanel
        t={t}
        kits={kitsWithUnlock}
        wellnessBalance={credits?.wellness.balance ?? 0}
        prefillName={user?.fullName ?? ""}
        prefillCountry={(sub.countryCode ?? "").toUpperCase()}
        returnState={returnState ?? null}
      />
    </div>
  );
}
