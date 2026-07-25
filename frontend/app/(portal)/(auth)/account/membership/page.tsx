import type { Metadata } from "next";
import Link from "next/link";
import { Award, Activity, CalendarClock, CreditCard, Sparkles, Gift, CheckCircle2 } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  getServerCredits,
  getServerRedemptions,
  getServerSubscription,
} from "@/lib/api/me-subscription-server";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { AdminEmptyState, AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { ManagePanel, type PlanOption } from "./_components/ManagePanel";
import { MembershipTabsClient } from "./_components/MembershipTabsClient";
import { SubscriptionDashboard } from "../_components/SubscriptionDashboard";
import { RewardsPanel } from "../rewards/_components/RewardsPanel";

export const metadata: Metadata = { title: "Your membership", robots: { index: false } };

type Search = { subscription?: string; redemption?: string; plan?: string; tab?: string };

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [
    { subscription: returnState, plan: requestedPlanId, redemption: redemptionState },
    sub,
    credits,
    redemptions,
    user,
    locale,
  ] = await Promise.all([
    searchParams,
    getServerSubscription(),
    getServerCredits(),
    getServerRedemptions(),
    getServerAuthUser(),
    getPageLocale(),
  ]);
  const { subscription, account: a } = loadLocaleBundle(locale);
  const t = subscription.manage;
  const rt = subscription.redeem;

  if (!sub || !sub.plan) {
    return (
      <div className="gh-patient-page gh-patient-membership-page">
        <PageHeader title={t.title} description={t.subtitle} />
        <div className="gh-patient-empty-state gh-card max-w-xl p-8">
          <AdminEmptyState
            title={a.membership.noActiveMembership}
            description={t.noSubscription}
            action={
              <Link href="/" className="gh-btn gh-btn-primary inline-flex justify-center">
                {t.browsePlans}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // Upgrade/downgrade options come from the same country's catalogue. Also
  // drives the wellness-kit unlock condition below (one fetch, both tabs).
  const config = sub.countryCode ? getCountryByCode(sub.countryCode) : null;
  const plans = sub.countryCode ? await getCountryPlans(sub.countryCode, locale) : [];
  const planOptions: PlanOption[] = plans
    .filter((p) => p.id !== sub.plan!.id)
    .map((p) => ({
      id: p.id,
      name: p.name,
      priceLabel: formatPrice(p.monthlyPriceCents, p.currencyCode, { maximumFractionDigits: 0 }),
      priceCents: p.monthlyPriceCents,
    }));

  const priceLabel = formatPrice(sub.plan.monthlyPriceCents, sub.plan.currencyCode, {
    maximumFractionDigits: 0,
  });
  const nextBillingLabel = sub.currentPeriodEnd ? formatAppDate(sub.currentPeriodEnd) : null;
  const pendingChangeDate = sub.pendingChange?.effectiveAt
    ? formatAppDate(sub.pendingChange.effectiveAt)
    : null;
  const pricingHref = config ? `/${config.slug}/${locale}/pricing` : "/";

  const kits = redemptions?.kits ?? [];
  const livePlan = plans.find((p) => p.id === sub.plan?.id);
  const unlockByKit = new Map(
    (livePlan?.wellnessKits ?? []).map((k) => [k.healthTestId, k.unlockAfterPaidMonths]),
  );
  const kitsWithUnlock = kits.map((k) => ({
    ...k,
    unlockMonths: unlockByKit.get(k.healthTestId) ?? null,
  }));

  return (
    <div className="gh-patient-page gh-patient-membership-page">
      <PageHeader title={t.title} description={t.subtitle} />
      <MembershipTabsClient
        tabMembership={a.nav.membership}
        tabRewards={a.nav.rewards}
        tabsAria={a.membership.tabsAria}
        membershipPanel={
          <>
            <AdminSummaryStrip
              className="mb-5"
              items={[
                { label: a.membership.sumPlan, value: sub.plan.name, hint: a.membership.sumPlanHint, icon: <Award aria-hidden /> },
                { label: a.membership.sumStatus, value: sub.status.toLowerCase(), hint: sub.cancelAtPeriodEnd ? a.membership.cancellationScheduled : a.membership.sumStatusHint, icon: <Activity aria-hidden /> },
                { label: a.membership.sumNextBilling, value: nextBillingLabel ?? a.membership.notScheduled, hint: a.membership.sumNextBillingHint, icon: <CalendarClock aria-hidden /> },
                { label: a.membership.sumPrice, value: priceLabel, hint: a.membership.sumPriceHint, icon: <CreditCard aria-hidden /> },
              ]}
            />
            <ManagePanel
              t={t}
              status={sub.status}
              planName={sub.plan.name}
              priceLabel={priceLabel}
              currentPriceCents={sub.plan.monthlyPriceCents}
              nextBillingLabel={nextBillingLabel}
              cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
              pendingChangePlanName={sub.pendingChange?.planName ?? null}
              pendingChangeDate={pendingChangeDate}
              planOptions={planOptions}
              // Pricing-page "Switch to this plan" carries ?plan= — preselect it in
              // the change dropdown when it's a valid switch target.
              initialPlanId={planOptions.some((p) => p.id === requestedPlanId) ? requestedPlanId! : null}
              returnState={returnState ?? null}
              pricingHref={pricingHref}
            />
            {/* Consolidated benefits: GP credits remaining, wellness, discount perks
                and their unlock conditions (Req 3). Reuses the dashboard widgets;
                `embedded` hides its plan card since ManagePanel shows that above. */}
            <SubscriptionDashboard locale={locale} embedded />
          </>
        }
        rewardsPanel={
          kits.length === 0 ? (
            <div className="gh-patient-empty-state gh-card max-w-xl p-8">
              <AdminEmptyState
                as="h2"
                title={a.membership.noRewardsTitle}
                description={subscription.dashboard.wellnessNone}
              />
            </div>
          ) : (
            <>
              <AdminSummaryStrip
                className="mb-5"
                items={[
                  { label: a.membership.sumWellnessBalance, value: String(credits?.wellness.balance ?? 0), hint: a.membership.sumWellnessBalanceHint, icon: <Sparkles aria-hidden /> },
                  { label: a.membership.sumRewardKits, value: String(kitsWithUnlock.length), hint: a.membership.sumRewardKitsHint, icon: <Gift aria-hidden /> },
                  { label: a.membership.sumEligibleNow, value: String(kitsWithUnlock.filter((kit) => kit.eligible).length), hint: a.membership.sumEligibleNowHint, icon: <CheckCircle2 aria-hidden /> },
                  { label: a.membership.sumMembership, value: sub.status.toLowerCase(), hint: sub.plan?.name ?? a.membership.currentPlanHint, icon: <Award aria-hidden /> },
                ]}
              />
              <RewardsPanel
                t={rt}
                shippingLabels={a.rewards}
                kits={kitsWithUnlock}
                wellnessBalance={credits?.wellness.balance ?? 0}
                prefillName={user?.fullName ?? ""}
                prefillCountry={(sub.countryCode ?? "").toUpperCase()}
                returnState={redemptionState ?? null}
              />
            </>
          )
        }
      />
    </div>
  );
}
