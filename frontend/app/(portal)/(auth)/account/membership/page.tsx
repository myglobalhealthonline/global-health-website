import type { Metadata } from "next";
import Link from "next/link";
import { Award, Sparkles, Gift, CheckCircle2 } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  getServerCredits,
  getServerRedemptions,
  getServerSubscription,
} from "@/lib/api/me-subscription-server";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { deriveMemberId } from "@/lib/subscription/member-id";
import { subscriptionStatusLabel } from "@/lib/subscription/status-label";
import { ManagePanel, type PlanOption } from "./_components/ManagePanel";
import { MembershipCard } from "./_components/MembershipCard";
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
    getPortalLocale(),
  ]);
  const { subscription, account: a, common } = loadLocaleBundle(locale);
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

  // Tier position inside this country's ladder (cheapest = 1), for the card's
  // pips. 0 when the plan isn't in the fetched catalogue — pips are dropped.
  const ladder = [...plans].sort((x, y) => x.monthlyPriceCents - y.monthlyPriceCents);
  const tier = ladder.findIndex((p) => p.id === sub.plan!.id) + 1;
  const statusLabel = subscriptionStatusLabel(sub.status, t);

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
            {/* Hero: the card carries identity (plan, holder, member no.,
                renewal, market, status); the facts panel beside it carries the
                billing numbers. Nothing repeats — the old summary strip and the
                manage panel's "Current plan" block said the same things three
                times over. */}
            <div className="gh-membership-hero mb-5">
              <MembershipCard
                planName={sub.plan.name}
                cardholderName={user?.fullName ?? ""}
                memberId={user ? deriveMemberId(user.id) : "—"}
                validThrough={nextBillingLabel ?? a.membership.notScheduled}
                countryName={config?.name ?? null}
                status={sub.status}
                statusLabel={statusLabel}
                cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
                // Short pill copy — "Cancellation scheduled" ellipsises on the
                // card at column widths; the facts panel spells it out.
                cancelLabel={a.membership.cardEnding}
                tier={tier}
                labels={{
                  cardholder: a.membership.cardCardholder,
                  memberId: a.membership.cardMemberId,
                  validThrough: a.membership.cardValidThrough,
                  // Brand motto — same string the entry gate prints, kept
                  // untranslated in every locale bundle by design.
                  motto: common.entryGate.motto,
                }}
              />
              <AdminCard className="gh-membership-facts">
                <dl>
                  <div>
                    <dt>{t.monthlyPrice}</dt>
                    <dd>{priceLabel}</dd>
                  </div>
                  <div>
                    <dt>{t.nextBilling}</dt>
                    <dd>{nextBillingLabel ?? a.membership.notScheduled}</dd>
                  </div>
                  <div>
                    <dt>{a.membership.sumStatus}</dt>
                    <dd>{sub.cancelAtPeriodEnd ? a.membership.cancellationScheduled : statusLabel}</dd>
                  </div>
                </dl>
              </AdminCard>
            </div>
            <ManagePanel
              t={t}
              status={sub.status}
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
