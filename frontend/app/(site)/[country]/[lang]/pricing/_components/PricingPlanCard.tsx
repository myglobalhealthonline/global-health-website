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
}

/**
 * Presentational pricing card (gh2 system, light surface). Featured plans get
 * a lime accent ring + badge. All copy is localized; the perk-unlock note is
 * data-driven from `plan.perkUnlockMonths` (§36.17). Family is intentionally
 * NOT shown (Wave 5, D20).
 */
export function PricingPlanCard({ plan, t, note, ctaHref }: PricingPlanCardProps) {
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
    t.specialistLine,
    ...(wellnessLine ? [wellnessLine, t.wellnessRedeemLine] : []),
  ];
  const features = plan.features.length > 0 ? plan.features : autoFeatures;

  return (
    <article
      className="group relative flex flex-col rounded-[var(--radius-card)] bg-[var(--color-background-page)] p-7 transition-all duration-300 focus-within:-translate-y-0.5 hover:-translate-y-0.5"
      style={{
        border: featured
          ? "1.5px solid var(--color-brand-accent)"
          : "1px solid var(--color-border)",
        boxShadow: featured
          ? "0 18px 40px -24px rgba(15,46,37,0.35)"
          : "0 1px 2px rgba(15,46,37,0.04)",
      }}
    >
      {badge ? (
        <span
          className="absolute right-6 top-6 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={
            featured
              ? { background: "var(--color-brand-accent)", color: "#0F2E25" }
              : { background: "var(--color-background-soft)", color: "var(--color-text-muted)" }
          }
        >
          {badge}
        </span>
      ) : null}

      <h3
        className="font-extrabold tracking-[-0.02em]"
        style={{ fontSize: "clamp(1.25rem,1.4vw + 0.6rem,1.6rem)", color: "var(--color-text-primary)" }}
      >
        {plan.name}
      </h3>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span
          className="font-extrabold tracking-[-0.04em]"
          style={{ fontSize: "clamp(2.4rem,2vw + 1.6rem,3rem)", color: "var(--color-text-primary)" }}
        >
          {price}
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
          {t.perMonth}
        </span>
      </p>

      {plan.shortDescription ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {plan.shortDescription}
        </p>
      ) : null}

      <div className="my-6 h-px w-full" style={{ background: "var(--color-border)" }} />

      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
        {t.includesHeading}
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {features.map((line, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--color-text-primary)" }}>
            <Check
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2.5}
              style={{ color: "var(--color-brand-primary)" }}
              aria-hidden
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {perkNote ? (
        <p className="mt-5 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {perkNote}
        </p>
      ) : null}

      <div className="mt-auto pt-7">
        <Link
          href={ctaHref}
          className={
            featured
              ? "gh2-btn-lime w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,241,34,0.45)]"
              : "gh-btn gh-btn-primary w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-primary)]"
          }
        >
          {interpolate(t.choosePlan, { plan: plan.name })}
          <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
        </Link>
        <p className="mt-3 text-center text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {t.onlineOnlyNote}
        </p>
      </div>
    </article>
  );
}
