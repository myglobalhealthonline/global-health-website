import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Award, BadgeCheck, CalendarClock, CheckCircle2, CreditCard, Gift, Sparkles } from "lucide-react";
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
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader, SectionHeader, StatCard } from "@/components/portal-atoms";
import { deriveMemberId } from "@/lib/subscription/member-id";
import { subscriptionStatusLabel } from "@/lib/subscription/status-label";
import { interpolate } from "@/lib/subscription/format";
import { ManagePanel, type PlanOption } from "./_components/ManagePanel";
import { MembershipCard } from "../_components/MembershipCard";
import { MembershipTimeline, type TimelineStep } from "../_components/MembershipTimeline";
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
        <PageHeader
          eyebrow={a.nav.membership}
          icon={<BadgeCheck aria-hidden />}
          title={t.title}
          description={t.subtitle}
        />
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
  const benefitsLive = sub.benefitsUnlocked !== false && sub.status === "ACTIVE";
  const unlockMonths = sub.benefitsUnlockAfterPaidMonths ?? 2;
  // "Member since" only exists once a payment has cleared; before that the tile
  // and the timeline both say so rather than showing an empty slot.
  // Derived by counting the paid months back from the current period end —
  // the API carries no start date.
  const memberSince = (() => {
    if (sub.paidMonthsCount <= 0 || !sub.currentPeriodEnd) return null;
    const started = new Date(sub.currentPeriodEnd);
    started.setMonth(started.getMonth() - sub.paidMonthsCount);
    return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(started);
  })();

  /** Lifecycle steps: what already happened, what is happening, what is next. */
  const steps: TimelineStep[] = sub.status === "ACTIVE"
    ? [
        {
          state: "done",
          when: memberSince ?? a.membership.stepWhenNow,
          title: a.membership.stepStartedTitle,
          body: a.membership.stepStartedBody,
        },
        benefitsLive
          ? {
              state: "done" as const,
              when: interpolate(a.membership.stepWhenAfterMonths, { months: unlockMonths }),
              title: a.membership.stepUnlockedTitle,
              body: interpolate(a.membership.stepUnlockedBody, { months: unlockMonths }),
            }
          : {
              state: "todo" as const,
              when: interpolate(a.membership.stepWhenAfterMonths, { months: unlockMonths }),
              title: a.membership.stepUnlockTitle,
              body: a.membership.stepUnlockBody,
            },
        sub.cancelAtPeriodEnd
          ? {
              state: "now" as const,
              when: nextBillingLabel ?? a.membership.stepWhenNext,
              title: a.membership.stepEndsTitle,
              body: a.membership.stepEndsBody,
            }
          : {
              state: "now" as const,
              when: nextBillingLabel ?? a.membership.stepWhenNext,
              title: interpolate(a.membership.stepRenewTitle, { price: priceLabel }),
              body: a.membership.stepRenewBody,
            },
      ]
    : [
        {
          state: "now",
          when: a.membership.stepWhenNow,
          title: a.membership.stepWaitingTitle,
          body: a.membership.stepWaitingBody,
        },
        {
          state: "todo",
          when: a.membership.stepWhenNext,
          title: a.membership.stepSwitchOnTitle,
          body: a.membership.stepSwitchOnBody,
        },
        {
          state: "todo",
          when: interpolate(a.membership.stepWhenAfterMonths, { months: unlockMonths }),
          title: a.membership.stepUnlockTitle,
          body: a.membership.stepUnlockBody,
        },
      ];

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
      <PageHeader
        eyebrow={a.nav.membership}
        icon={<BadgeCheck aria-hidden />}
        title={t.title}
        description={t.subtitle}
      />
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
              {/* Billing facts as the portal's own stat tiles — same anatomy
                  as the account dashboard, so the tab reads as portal
                  furniture rather than a bespoke panel. */}
              <div className="gh-membership-facts grid gap-3">
                <StatCard
                  tone="brand"
                  label={t.monthlyPrice}
                  value={priceLabel}
                  hint={a.membership.priceHintBilled}
                  icon={<CreditCard className="size-5" aria-hidden />}
                />
                {/* No period end exists until the first payment clears — say
                    that, instead of the bare "Not scheduled" that read as a
                    bug. */}
                <StatCard
                  tone={nextBillingLabel ? "accent" : "warning"}
                  label={t.nextBilling}
                  value={nextBillingLabel ?? a.membership.billingNotSet}
                  hint={nextBillingLabel ? a.membership.sumNextBillingHint : a.membership.billingNotSetHint}
                  icon={<CalendarClock className="size-5" aria-hidden />}
                />
                <StatCard
                  tone="neutral"
                  label={a.membership.memberSince}
                  value={memberSince ?? a.membership.memberSincePending}
                  hint={
                    memberSince
                      ? interpolate(a.membership.memberSinceHint, { months: sub.paidMonthsCount })
                      : a.membership.memberSinceHintPending
                  }
                  icon={<Activity className="size-5" aria-hidden />}
                />
              </div>
            </div>
            {/* Benefits (what you get) — rendered by the dashboard in its
                embedded cut, so credits/wellness/perks stay one source. */}
            <SubscriptionDashboard locale={locale} embedded />

            <AdminCard padding={0} className="mt-5">
              <SectionHeader as="h2" title={a.membership.timelineTitle} description={a.membership.timelineDesc} />
              <div className="p-5">
                <MembershipTimeline steps={steps} />
              </div>
            </AdminCard>

            <div className="mt-5">
            <ManagePanel
              t={t}
              m={a.membership}
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
            </div>
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
