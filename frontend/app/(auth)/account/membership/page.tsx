import type { Metadata } from "next";
import Link from "next/link";
import { getCountryByCode } from "@/data/countries";
import { getServerSubscription } from "@/lib/api/me-subscription-server";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { PageHeader } from "@/components/portal-atoms";
import { ManagePanel, type PlanOption } from "./_components/ManagePanel";
import { SubscriptionDashboard } from "../_components/SubscriptionDashboard";

export const metadata: Metadata = { title: "Your membership", robots: { index: false } };

type Search = { subscription?: string; redemption?: string };

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [{ subscription: returnState }, sub, locale] = await Promise.all([
    searchParams,
    getServerSubscription(),
    getPageLocale(),
  ]);
  const { subscription } = loadLocaleBundle(locale);
  const t = subscription.manage;

  if (!sub || !sub.plan) {
    return (
      <>
        <PageHeader title={t.title} description={t.subtitle} />
        <div className="gh-card max-w-xl p-8 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t.noSubscription}
          </p>
          <Link href="/" className="gh-btn gh-btn-primary mt-6 inline-flex justify-center">
            {t.browsePlans}
          </Link>
        </div>
      </>
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
    <>
      <PageHeader title={t.title} description={t.subtitle} />
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
        returnState={returnState ?? null}
        pricingHref={pricingHref}
      />
      {/* Consolidated benefits: GP credits remaining, wellness, discount perks
          and their unlock conditions (Req 3). Reuses the dashboard widgets;
          `embedded` hides its plan card since ManagePanel shows that above. */}
      <SubscriptionDashboard locale={locale} embedded />
    </>
  );
}
