import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { PublicPlan } from "@/data/pricing-plans";
import { formatPrice } from "@/lib/format-currency";
import { formatPerkUnlockNote, interpolate, pluralTemplate } from "@/lib/subscription/format";

type PricingCopy = ReturnType<
  typeof import("@/lib/i18n/load-locale")["loadLocaleBundle"]
>["subscription"]["pricing"];
type NoteCopy = ReturnType<
  typeof import("@/lib/i18n/load-locale")["loadLocaleBundle"]
>["subscription"]["note"];

export interface PricingPlanCardProps {
  plan: PublicPlan;
  t: PricingCopy;
  note: NoteCopy;
  ctaHref: string;
  /** True when this card is the viewer's active subscription (Req 1). */
  isCurrentPlan?: boolean;
  /** True when the viewer has any active subscription in this country. */
  hasActiveSub?: boolean;
  /** Where "Manage plan" / "Switch to this plan" route (the portal). */
  manageHref?: string;
}

/**
 * Presentational pricing card (gh2 system, light surface). Featured plans get a
 * lime accent ring, top bar + badge and sit slightly raised. Rows use reserved
 * heights (badge / title / description) so price, divider and the "Includes"
 * list line up across cards of different content length. All copy is localized;
 * the perk-unlock note is data-driven from `plan.perkUnlockMonths` (§36.17).
 * Family is intentionally NOT shown (Wave 5, D20).
 */
export function PricingPlanCard({
  plan,
  t,
  note,
  ctaHref,
  isCurrentPlan = false,
  hasActiveSub = false,
  manageHref = "/account/membership",
}: PricingPlanCardProps) {
  const featured = plan.isFeatured;
  const price = formatPrice(plan.monthlyPriceCents, plan.currencyCode, { maximumFractionDigits: 0 });
  const credits = plan.monthlyConsultationCredits;
  const creditsLine = interpolate(
    pluralTemplate(credits, t.creditLabel, t.creditsLabel),
    { count: credits },
  );
  const wellness = plan.wellnessCreditsPerMonth;
  const wellnessLine =
    wellness > 0
      ? interpolate(pluralTemplate(wellness, t.wellnessLabelSingular, t.wellnessLabel), { count: wellness })
      : null;
  const perkNote = formatPerkUnlockNote(plan.perkUnlockMonths, note);
  const badge = featured ? t.featuredBadge : plan.badgeLabel;

  // Admin-edited bullets (resolved locale) win when present; else the
  // auto-generated defaults (§12).
  const autoFeatures = [
    creditsLine,
    t.secureLine,
    t.bookingLine,
    // Only claim specialist savings when a rule actually grants them — a plan
    // with no specialist discount must not advertise one.
    ...(plan.hasSpecialistDiscount ? [t.specialistLine] : []),
    ...(wellnessLine ? [wellnessLine, t.wellnessRedeemLine] : []),
  ];
  const features = plan.features.length > 0 ? plan.features : autoFeatures;

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] gh2-glass-forest p-7 transition-all duration-300 focus-within:-translate-y-1 hover:-translate-y-1 lg:p-8"
      style={{
        border: isCurrentPlan
          ? "1.5px solid var(--color-brand-accent)"
          : featured
            ? "1.5px solid var(--color-brand-accent)"
            : "1px solid rgba(255,255,255,0.14)",
        boxShadow: featured || isCurrentPlan
          ? "0 24px 50px -28px rgba(0,0,0,0.45), 0 0 0 1px rgba(176,241,34,0.10)"
          : "0 1px 2px rgba(0,0,0,0.15)",
      }}
    >
      {/* Top accent bar — featured only */}
      {featured ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, var(--color-brand-primary), var(--color-brand-accent))" }}
        />
      ) : null}

      {/* Badge row — reserved height on every card so titles align. The
          "Current plan" marker (Req 1) takes priority over featured/admin badges. */}
      <div className="mb-4 flex min-h-[1.75rem] items-start">
        {isCurrentPlan ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ background: "var(--color-brand-primary)", color: "#fff" }}
          >
            <Check className="size-3" strokeWidth={3.25} aria-hidden />
            {t.currentPlan}
          </span>
        ) : badge ? (
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={
              featured
                ? { background: "var(--color-brand-accent)", color: "#0F2E25" }
                : {
                    background: "var(--color-background-soft)",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                  }
            }
          >
            {badge}
          </span>
        ) : null}
      </div>

      {/* Plan name — reserve 2 lines so the price row lines up across cards. */}
      <h3
        className="line-clamp-2 flex items-start font-extrabold tracking-[-0.02em]"
        title={plan.name}
        style={{
          fontSize: "clamp(1.2rem,1.1vw + 0.7rem,1.45rem)",
          lineHeight: 1.2,
          minHeight: "2.4em",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {plan.name}
      </h3>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span
          className="font-extrabold tracking-[-0.04em]"
          style={{ fontSize: "clamp(2.6rem,2vw + 1.8rem,3.25rem)", color: "var(--color-brand-accent)" }}
        >
          {price}
        </span>
        <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
          {t.perMonth}
        </span>
      </p>

      {/* Short description — reserve 2 lines so dividers align. */}
      <p
        className="mt-3 line-clamp-2 text-sm leading-relaxed"
        title={plan.shortDescription ?? undefined}
        style={{ color: "rgba(255,255,255,0.65)", minHeight: "2.8em" }}
      >
        {plan.shortDescription}
      </p>

      <div className="my-6 h-px w-full" style={{ background: "rgba(255,255,255,0.10)" }} />

      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.55)" }}>
        {t.includesHeading}
      </p>
      <ul className="mt-4 flex flex-col gap-3.5">
        {features.map((line, i) => (
          <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span
              aria-hidden
              className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(176,241,34,0.15)" }}
            >
              <Check className="size-3" strokeWidth={3.25} style={{ color: "var(--color-brand-accent)" }} />
            </span>
            <span className="leading-snug">{line}</span>
          </li>
        ))}
      </ul>

      {/* Bottom cluster — pinned to the card foot so cards of different bullet
          counts keep their CTA aligned. */}
      <div className="mt-auto pt-7">
        {perkNote ? (
          <p className="mb-5 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            {perkNote}
          </p>
        ) : null}
        {isCurrentPlan ? (
          <div className="flex flex-col gap-2.5">
            {/* Active plan — not re-purchasable. Route to the portal to manage. */}
            <span
              aria-disabled="true"
              className="gh-btn w-full cursor-default justify-center gap-1.5"
              style={{
                background: "var(--color-background-soft)",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Check className="size-4" strokeWidth={3} aria-hidden />
              {t.currentPlan}
            </span>
            <Link
              href={manageHref}
              className="text-center text-xs font-semibold underline-offset-2 hover:underline"
              style={{ color: "var(--color-brand-accent)" }}
            >
              {t.managePlan}
            </Link>
          </div>
        ) : (
          // With another active plan, a card offers a next-cycle SWITCH (handled
          // in the portal), never a second purchase. No sub → normal subscribe.
          <Link
            href={hasActiveSub ? manageHref : ctaHref}
            aria-label={
              hasActiveSub ? t.switchToThisPlan : interpolate(t.choosePlan, { plan: plan.name })
            }
            className={
              featured
                ? "gh2-btn-lime w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,241,34,0.45)]"
                : "gh-btn gh-btn-primary w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-primary)]"
            }
          >
            {hasActiveSub ? t.switchToThisPlan : t.chooseCta}
            <ArrowUpRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        )}

      </div>
    </article>
  );
}
