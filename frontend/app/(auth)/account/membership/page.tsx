import type { Metadata } from "next";
import Link from "next/link";
import { Award, Activity, CalendarClock, CreditCard } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getServerSubscription } from "@/lib/api/me-subscription-server";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { AdminEmptyState, AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { ManagePanel, type PlanOption } from "./_components/ManagePanel";
import { SubscriptionDashboard } from "../_components/SubscriptionDashboard";

export const metadata: Metadata = { title: "Your membership", robots: { index: false } };

type Search = { subscription?: string; redemption?: string; plan?: string };

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [{ subscription: returnState, plan: requestedPlanId }, sub, locale] = await Promise.all([
    searchParams,
    getServerSubscription(),
    getPageLocale(),
  ]);
  const { subscription } = loadLocaleBundle(locale);
  const t = subscription.manage;

  if (!sub || !sub.plan) {
    return (
      <div className="gh-patient-page gh-patient-membership-page">
        <PageHeader title={t.title} description={t.subtitle} />
        <div className="gh-patient-empty-state gh-card max-w-xl p-8">
          <AdminEmptyState
            title="No active membership"
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

  // Upgrade/downgrade options come from the same country's catalogue.
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

  return (
    <div className="gh-patient-page gh-patient-membership-page">
      <PageHeader title={t.title} description={t.subtitle} />
      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Plan", value: sub.plan.name, hint: "Current membership", icon: <Award aria-hidden /> },
          { label: "Status", value: sub.status.toLowerCase(), hint: sub.cancelAtPeriodEnd ? "Cancellation scheduled" : "Membership lifecycle", icon: <Activity aria-hidden /> },
          { label: "Next billing", value: nextBillingLabel ?? "Not scheduled", hint: "Renewal date", icon: <CalendarClock aria-hidden /> },
          { label: "Price", value: priceLabel, hint: "Monthly subscription", icon: <CreditCard aria-hidden /> },
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
    </div>
  );
}
