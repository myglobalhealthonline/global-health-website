import Link from "next/link";
import { Award, CreditCard, Gift, Lock, Sparkles, Stethoscope } from "lucide-react";
import type { LocaleCode } from "@/lib/i18n/types";
import { getCountryByCode } from "@/data/countries";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  getServerCredits,
  getServerRedemptions,
  getServerSubscription,
} from "@/lib/api/me-subscription-server";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import {
  creditReasonLabel,
  effectivePerkUnlockMonths,
  formatCreditDelta,
  interpolate,
  perkStatus,
  pluralTemplate,
  remainingCredits,
} from "@/lib/subscription/format";
import { deriveMemberId } from "@/lib/subscription/member-id";
import { subscriptionStatusLabel } from "@/lib/subscription/status-label";
import { AdminCard } from "@/components/portal-atoms";
import { MembershipCard } from "./MembershipCard";

/**
 * Patient dashboard subscription cards (§12). Server component — reads the
 * patient money APIs and the live plan catalogue (for perk display), then
 * renders the active plan, consultation credits, wellness balance + redemption
 * progress, and locked perks with their unlock condition. All "after N paid
 * months" copy is data-driven (§36.17). Renders nothing for non-subscribers so
 * the existing dashboard is unchanged.
 */
/**
 * `embedded` renders the benefit detail WITHOUT the plan summary card or the
 * section heading — used on the Membership page, where `ManagePanel` already
 * shows the plan, status, billing date and lifecycle actions.
 *
 * `variant="compact"` is the opposite cut: ONLY the plan card, nothing else
 * (credits/wellness/perks/ledger). Used on the dashboard overview — owner
 * request: "overview page is directed to membership, just display membership
 * card nothing more". The full render (default) stays on the Membership page.
 */
export async function SubscriptionDashboard({
  locale,
  embedded = false,
  variant,
}: {
  locale: LocaleCode;
  embedded?: boolean;
  variant?: "compact";
}) {
  const [sub, credits, redemptions, user] = await Promise.all([
    getServerSubscription(),
    getServerCredits(),
    getServerRedemptions(),
    getServerAuthUser(),
  ]);

  if (!sub || !sub.plan) return null;

  const { subscription, account, common } = loadLocaleBundle(locale);
  const t = subscription.dashboard;
  const country = sub.countryCode ? getCountryByCode(sub.countryCode) : null;

  const plans = sub.countryCode ? await getCountryPlans(sub.countryCode, locale) : [];
  const livePlan = plans.find((p) => p.id === sub.plan!.id) ?? null;

  const priceLabel = formatPrice(sub.plan.monthlyPriceCents, sub.plan.currencyCode, {
    maximumFractionDigits: 0,
  });
  const nextBilling = sub.currentPeriodEnd ? formatAppDate(sub.currentPeriodEnd) : null;
  const statusLabel = subscriptionStatusLabel(sub.status, subscription.manage);

  // The membership card, rendered identically on the overview (compact) and
  // the membership tab — one card, not a second summary of the same plan.
  const ladder = [...plans].sort((x, y) => x.monthlyPriceCents - y.monthlyPriceCents);
  const planCard = (
    <MembershipCard
      planName={sub.plan.name}
      cardholderName={user?.fullName ?? ""}
      memberId={user ? deriveMemberId(user.id) : "—"}
      validThrough={nextBilling ?? account.membership.notScheduled}
      countryName={country?.name ?? null}
      status={sub.status}
      statusLabel={statusLabel}
      cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
      cancelLabel={account.membership.cardEnding}
      tier={ladder.findIndex((p) => p.id === sub.plan!.id) + 1}
      labels={{
        cardholder: account.membership.cardCardholder,
        memberId: account.membership.cardMemberId,
        validThrough: account.membership.cardValidThrough,
        motto: common.entryGate.motto,
      }}
    />
  );

  // Consultation credits
  const remaining = credits?.consultation.balance ?? 0;
  const used = credits?.consultation.usedThisPeriod ?? 0;
  const granted = livePlan?.monthlyConsultationCredits ?? remaining + used;
  // D25: benefits (incl. GP credits) are withheld until the unlock month.
  const benefitsLocked = sub.benefitsUnlocked === false;
  // Data-driven unlock month (§36.17) — never a hardcoded "2" (issue #11).
  const benefitsUnlockMonths = sub.benefitsUnlockAfterPaidMonths ?? 2;

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

  if (variant === "compact") {
    return (
      <section className="gh-patient-subscription-dashboard gh-patient-membership-teaser mt-6">
        {planCard}
        <p className="mt-3 text-sm" style={{ color: "var(--portal-muted)" }}>
          {priceLabel} {subscription.pricing.perMonth}
          {nextBilling ? ` · ${interpolate(t.nextBilling, { date: nextBilling })}` : ""}
          {sub.paidMonthsCount > 0
            ? ` · ${interpolate(
                pluralTemplate(sub.paidMonthsCount, t.memberMonthsSingular, t.memberMonths),
                { months: sub.paidMonthsCount },
              )}`
            : ""}
        </p>
        <Link
          href="/account/membership"
          className="mt-2 inline-flex text-sm font-semibold underline"
          style={{ color: "var(--portal-primary)" }}
        >
          {t.manage}
        </Link>
      </section>
    );
  }

  return (
    <section className="gh-patient-subscription-dashboard mt-6">
      {embedded ? null : (
        <h2 className="mb-3 text-portal-compact font-bold uppercase tracking-[0.14em]" style={{ color: "var(--portal-muted)" }}>
          {t.heading}
        </h2>
      )}

      <div className={embedded ? "gh-patient-subscription-grid grid gap-4 sm:grid-cols-2" : "gh-patient-subscription-grid grid gap-4 lg:grid-cols-3"}>
        {/* Plan — hidden when embedded (the membership tab shows the card in
            its own hero). Same MembershipCard as everywhere else. */}
        {embedded ? null : <div className="gh-patient-plan-cell">{planCard}</div>}

        {/* Consultation credits — carries the system's one progress bar
            (§5.21: lime fill, --portal-well track, 6px, pill radius). */}
        <AdminCard>
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex size-10 items-center justify-center rounded-[12px]"
              style={{ background: "var(--portal-well)", color: "var(--portal-primary)" }}
            >
              <Stethoscope className="size-5" aria-hidden />
            </span>
          </div>
          <p className="mt-4 text-portal-thead font-bold uppercase tracking-[0.14em]" style={{ color: "var(--portal-muted)" }}>
            {t.creditsTitle}
          </p>
          {benefitsLocked ? (
            // D25: credits are withheld until the unlock month (not granted, so
            // they can't be wiped by the reset). Show the data-driven unlock
            // condition rather than a confusing "0 of N used" or "no credits".
            <p className="mt-2 flex items-start gap-2 text-sm" style={{ color: "var(--portal-muted)" }}>
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{interpolate(t.creditsLocked, { total: granted, months: benefitsUnlockMonths })}</span>
            </p>
          ) : granted > 0 || remaining > 0 ? (
            <>
              <p className="mt-1 font-extrabold tracking-[-0.03em]" style={{ fontSize: "2rem", color: "var(--portal-text)" }}>
                {remaining}
              </p>
              <p className="text-sm" style={{ color: "var(--portal-muted)" }}>
                {t.creditsRemainingThisMonth} · {interpolate(t.creditsUsed, { used, total: granted })}
              </p>
              {granted > 0 ? (
                <div
                  className="gh-patient-credit-progress mt-3"
                  style={{ height: 6, borderRadius: 999, background: "var(--portal-well)", overflow: "hidden" }}
                  role="progressbar"
                  aria-valuenow={used}
                  aria-valuemin={0}
                  aria-valuemax={granted}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      width: `${Math.min(100, (used / granted) * 100)}%`,
                      background: "var(--portal-signal)",
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--portal-muted)" }}>{t.creditsNone}</p>
          )}
        </AdminCard>

        {/* Wellness */}
        <AdminCard>
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex size-10 items-center justify-center rounded-[12px]"
              style={{ background: "var(--portal-well)", color: "var(--portal-accent-text)" }}
            >
              <Sparkles className="size-5" aria-hidden />
            </span>
          </div>
          <p className="mt-4 text-portal-thead font-bold uppercase tracking-[0.14em]" style={{ color: "var(--portal-muted)" }}>
            {t.wellnessTitle}
          </p>
          {hasWellness ? (
            <>
              <p className="mt-1 font-extrabold tracking-[-0.03em]" style={{ fontSize: "2rem", color: "var(--portal-text)" }}>
                {wellnessBalance}
              </p>
              {cheapestKit ? (
                cheapestKit.eligible ? (
                  <p className="text-sm" style={{ color: "var(--portal-primary)" }}>
                    {interpolate(t.wellnessReady, { kit: cheapestKit.name })}
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "var(--portal-muted)" }}>
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
                  style={{ color: "var(--portal-primary)" }}
                >
                  <Gift className="size-4" aria-hidden />
                  {t.redeem}
                </Link>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--portal-muted)" }}>{t.wellnessNone}</p>
          )}
        </AdminCard>
      </div>

      {/* Perks */}
      {perks.length > 0 ? (
        <AdminCard className="mt-4">
          <div className="flex items-center gap-2.5">
            <CreditCard className="size-4" style={{ color: "var(--portal-primary)" }} aria-hidden />
            <p className="text-portal-thead font-bold uppercase tracking-[0.14em]" style={{ color: "var(--portal-muted)" }}>
              {t.perksTitle}
            </p>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {perks.map((perk) => {
              // Apply the plan-level D25 floor so a perk can't read "unlocked"
              // here while the cart still prices it LOCKED (issue #12).
              const status = perkStatus(perk, sub.paidMonthsCount, benefitsUnlockMonths);
              const months = effectivePerkUnlockMonths(perk, benefitsUnlockMonths);
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
                <li key={perk.perkKey} className="grid gap-2 rounded-[10px] p-3 sm:grid-cols-[1fr_auto] sm:items-start" style={{ background: "var(--portal-well)" }}>
                  <div className="flex items-start gap-2.5">
                    {status === "unlocked" ? (
                      <Award className="mt-0.5 size-4 shrink-0" style={{ color: "var(--portal-primary)" }} aria-hidden />
                    ) : (
                      <Lock className="mt-0.5 size-4 shrink-0" style={{ color: "var(--portal-muted)" }} aria-hidden />
                    )}
                    <span className="text-sm" style={{ color: "var(--portal-text)" }}>{perkLabel(perk.perkKey)}</span>
                  </div>
                  <span className="text-xs sm:shrink-0" style={{ color: status === "unlocked" ? "var(--portal-primary)" : "var(--portal-muted)" }}>
                    {condition}
                  </span>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      ) : null}

      {/* Credit activity (provenance — §4d): shows whether each change was
          earned, reset, reserved, used, redeemed, released, manually adjusted,
          or clawed back, so a manual admin adjustment is always visible. */}
      {credits && credits.ledger.length > 0 ? (
        <AdminCard className="mt-4">
          <div className="flex items-center gap-2.5">
            <CreditCard className="size-4" style={{ color: "var(--portal-primary)" }} aria-hidden />
            <p className="text-portal-thead font-bold uppercase tracking-[0.14em]" style={{ color: "var(--portal-muted)" }}>
              {t.activityTitle}
            </p>
          </div>
          <ul className="mt-3">
            {credits.ledger.slice(0, 8).map((entry, i) => {
              // A CONSUMED row with a 0 delta is the completion echo of the
              // paired "Reserved · −1" row — the delta already moved there,
              // so showing "Used for consultation · 0" reads as a no-op.
              // Relabel + hide the delta for this specific case only.
              const isCompletedConsumption = entry.reason === "CONSUMED" && entry.deltaCredits === 0;
              const label = isCompletedConsumption
                ? t.reason_CONSUMED_COMPLETED
                : creditReasonLabel(entry.reason, t as Record<string, string>);
              return (
                <li
                  key={i}
                  className="grid gap-2 border-t py-2.5 text-sm first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center"
                  style={{ borderColor: "var(--portal-line)" }}
                >
                  <div className="flex items-center gap-2.5">
                    {entry.kind === "WELLNESS" ? (
                      <Sparkles className="size-4 shrink-0" style={{ color: "var(--portal-accent)" }} aria-hidden />
                    ) : (
                      <Stethoscope className="size-4 shrink-0" style={{ color: "var(--portal-primary)" }} aria-hidden />
                    )}
                    <span style={{ color: "var(--portal-text)" }}>{label}</span>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    {isCompletedConsumption ? null : (
                      <span
                        className="font-semibold tabular-nums"
                        style={{ color: entry.deltaCredits >= 0 ? "var(--portal-primary)" : "var(--portal-danger-text)" }}
                      >
                        {formatCreditDelta(entry.deltaCredits)}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--portal-muted)" }}>
                      {formatAppDate(entry.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      ) : null}
    </section>
  );
}
