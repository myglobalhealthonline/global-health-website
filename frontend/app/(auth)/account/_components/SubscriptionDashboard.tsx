import Link from "next/link";
import { Award, CreditCard, Gift, Lock, Sparkles, Stethoscope } from "lucide-react";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import {
  getServerCredits,
  getServerRedemptions,
  getServerSubscription,
} from "@/lib/api/me-subscription-server";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import {
  interpolate,
  perkStatus,
  pluralTemplate,
  remainingCredits,
} from "@/lib/subscription/format";
import { AdminCard, Pill, type PillTone } from "@/components/portal-atoms";

/**
 * Patient dashboard subscription cards (§12). Server component — reads the
 * patient money APIs and the live plan catalogue (for perk display), then
 * renders the active plan, consultation credits, wellness balance + redemption
 * progress, and locked perks with their unlock condition. All "after N paid
 * months" copy is data-driven (§36.17). Renders nothing for non-subscribers so
 * the existing dashboard is unchanged.
 */
export async function SubscriptionDashboard({ locale }: { locale: LocaleCode }) {
  const [sub, credits, redemptions] = await Promise.all([
    getServerSubscription(),
    getServerCredits(),
    getServerRedemptions(),
  ]);

  if (!sub || !sub.plan) return null;

  const { subscription } = loadLocaleBundle(locale);
  const t = subscription.dashboard;

  const plans = sub.countryCode ? await getCountryPlans(sub.countryCode, locale) : [];
  const livePlan = plans.find((p) => p.id === sub.plan!.id) ?? null;

  const priceLabel = formatPrice(sub.plan.monthlyPriceCents, sub.plan.currencyCode, {
    maximumFractionDigits: 0,
  });
  const nextBilling = sub.currentPeriodEnd ? formatAppDate(sub.currentPeriodEnd) : null;
  const statusTone: PillTone =
    sub.status === "ACTIVE" ? "active" : sub.status === "CANCELED" ? "inactive" : "pending";
  const statusLabel =
    (
      {
        ACTIVE: subscription.manage.status_active,
        INCOMPLETE: subscription.manage.status_incomplete,
        PAST_DUE: subscription.manage.status_past_due,
        CANCELED: subscription.manage.status_canceled,
        PAUSED: subscription.manage.status_paused,
      } as Record<string, string>
    )[sub.status] ?? sub.status;

  // Consultation credits
  const remaining = credits?.consultation.balance ?? 0;
  const used = credits?.consultation.usedThisPeriod ?? 0;
  const granted = livePlan?.monthlyConsultationCredits ?? remaining + used;

  // Wellness: balance + progress toward the cheapest kit
  const wellnessBalance = credits?.wellness.balance ?? 0;
  const kits = redemptions?.kits ?? [];
  const cheapestKit = [...kits].sort((a, b) => a.requiredWellnessCredits - b.requiredWellnessCredits)[0];
  const hasWellness = (livePlan?.wellnessCreditsPerMonth ?? 0) > 0 || kits.length > 0;

  // Perks — exclude FAMILY_USAGE (Wave 5, D20) and unavailable perks.
  const perks = (livePlan?.perks ?? []).filter(
    (p) => p.perkKey !== "FAMILY_USAGE" && p.unlockMode !== "NOT_AVAILABLE",
  );
  const perkLabel = (key: string): string =>
    (t as Record<string, string>)[`perk_${key}`] ?? key;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>
        {t.heading}
      </h2>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Plan */}
        <AdminCard>
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex size-10 items-center justify-center rounded-[12px]"
              style={{ background: "linear-gradient(135deg, var(--color-brand-primary) 0%, #2A6B4E 100%)", color: "#B0F122" }}
            >
              <Award className="size-5" aria-hidden />
            </span>
            <Pill tone={statusTone} withDot>{statusLabel}</Pill>
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>
            {t.planCardTitle}
          </p>
          <p className="mt-1 font-extrabold tracking-[-0.02em]" style={{ fontSize: "1.25rem", color: "var(--color-text-primary)" }}>
            {sub.plan.name}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {priceLabel} {subscription.pricing.perMonth}
            {nextBilling ? ` · ${interpolate(t.nextBilling, { date: nextBilling })}` : ""}
          </p>
          <Link
            href="/account/membership"
            className="mt-4 inline-flex text-sm font-semibold underline"
            style={{ color: "var(--color-brand-primary)" }}
          >
            {t.manage}
          </Link>
        </AdminCard>

        {/* Consultation credits */}
        <AdminCard>
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex size-10 items-center justify-center rounded-[12px]"
              style={{ background: "linear-gradient(135deg, #F6F8F1 0%, #EDF2E2 100%)", color: "var(--color-brand-primary)" }}
            >
              <Stethoscope className="size-5" aria-hidden />
            </span>
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>
            {t.creditsTitle}
          </p>
          {granted > 0 || remaining > 0 ? (
            <>
              <p className="mt-1 font-extrabold tracking-[-0.03em]" style={{ fontSize: "2rem", color: "var(--color-text-primary)" }}>
                {remaining}
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {t.creditsRemainingThisMonth} · {interpolate(t.creditsUsed, { used, total: granted })}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>{t.creditsNone}</p>
          )}
        </AdminCard>

        {/* Wellness */}
        <AdminCard>
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex size-10 items-center justify-center rounded-[12px]"
              style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-brand-mint) 100%)", color: "#143B30" }}
            >
              <Sparkles className="size-5" aria-hidden />
            </span>
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>
            {t.wellnessTitle}
          </p>
          {hasWellness ? (
            <>
              <p className="mt-1 font-extrabold tracking-[-0.03em]" style={{ fontSize: "2rem", color: "var(--color-text-primary)" }}>
                {wellnessBalance}
              </p>
              {cheapestKit ? (
                cheapestKit.eligible ? (
                  <p className="text-sm" style={{ color: "var(--color-brand-primary)" }}>
                    {interpolate(t.wellnessReady, { kit: cheapestKit.name })}
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {interpolate(t.wellnessProgress, {
                      remaining: remainingCredits(wellnessBalance, cheapestKit.requiredWellnessCredits),
                      kit: cheapestKit.name,
                    })}
                  </p>
                )
              ) : null}
              {kits.length > 0 ? (
                <Link
                  href="/account/rewards"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline"
                  style={{ color: "var(--color-brand-primary)" }}
                >
                  <Gift className="size-4" aria-hidden />
                  {t.redeem}
                </Link>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>{t.wellnessNone}</p>
          )}
        </AdminCard>
      </div>

      {/* Perks */}
      {perks.length > 0 ? (
        <AdminCard className="mt-4">
          <div className="flex items-center gap-2.5">
            <CreditCard className="size-4" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>
              {t.perksTitle}
            </p>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {perks.map((perk) => {
              const status = perkStatus(perk, sub.paidMonthsCount);
              const months = perk.unlockAfterPaidMonths ?? 0;
              const condition =
                status === "unlocked"
                  ? t.perkUnlocked
                  : status === "manual"
                    ? t.perkLockedManual
                    : interpolate(
                        pluralTemplate(months, t.perkLockedAfterSingular, t.perkLockedAfter),
                        { months },
                      );
              return (
                <li key={perk.perkKey} className="flex items-start justify-between gap-3 rounded-[10px] p-3" style={{ background: "var(--color-background-soft)" }}>
                  <div className="flex items-start gap-2.5">
                    {status === "unlocked" ? (
                      <Award className="mt-0.5 size-4 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                    ) : (
                      <Lock className="mt-0.5 size-4 shrink-0" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                    )}
                    <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>{perkLabel(perk.perkKey)}</span>
                  </div>
                  <span className="shrink-0 text-xs" style={{ color: status === "unlocked" ? "var(--color-brand-primary)" : "var(--color-text-muted)" }}>
                    {condition}
                  </span>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      ) : null}
    </section>
  );
}
