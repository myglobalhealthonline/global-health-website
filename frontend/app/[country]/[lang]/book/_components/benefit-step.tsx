import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { buildBookHref } from "@/lib/routing/book-href";
import { formatPriceRounded } from "@/lib/format-currency";
import type { BenefitOption, BenefitOptionsResult } from "@/lib/api/me-benefit-options-server";
import { BookingSectionHeader } from "./booking-section-header";

type BookT = import("@/lib/i18n/types").CommonLocale["bookPage"];

/**
 * The benefit step (§11.2) — one step covering all four benefit sources,
 * standing exactly where the insurance-only step used to.
 *
 * It runs BEFORE time selection, because a fixed member price and an insurance
 * price both change what each slot costs, and because the insurer decides
 * which doctors exist at all. The consequence is that percent-based options
 * are priced off the base price and flagged `indicative`; the details step
 * re-prices with the real slot, so the number the patient confirms is the
 * number charged.
 *
 * Server-rendered and link-driven, like every other step in this wizard: the
 * choice rides in `?benefit=`. It is written to the cart at add-to-cart time
 * by the details form, not here — one write path shared with `/consult`, so
 * the two entry points cannot disagree about what the patient chose.
 *
 * Guests see the insurance options (which never needed an account) plus a
 * prompt to log in for the rest.
 */
export function BenefitStep({
  country,
  lang,
  serviceSlug,
  doctorSlug,
  basePriceCents,
  currencyCode,
  benefits,
  insuranceFallback,
  loginHref,
  bp,
}: {
  country: string;
  lang: string;
  serviceSlug: string;
  doctorSlug: string | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  /** Null for guests and on any backend failure — the login prompt shows. */
  benefits: BenefitOptionsResult | null;
  /**
   * Insurance options from the public payload, used when `benefits` is null.
   * Guests can still book on insurance today (§11.2), so losing the whole
   * step for them would be a regression, not a simplification.
   */
  insuranceFallback: { companyId: string; name: string; insurancePriceCents: number }[];
  loginHref: string;
  bp: BookT;
}) {
  const hrefFor = (benefit: string) =>
    buildBookHref({ country, lang, service: serviceSlug, doctor: doctorSlug, benefit });

  const options: BenefitOption[] =
    benefits?.options ??
    insuranceFallback.map((o) => ({
      source: "INSURANCE" as const,
      refId: o.companyId,
      label: o.name,
      unitPriceCents: o.insurancePriceCents,
      discountCents: 0,
      note: { key: "INSURANCE_DEFERRED" as const },
      indicative: false,
      recommended: false,
    }));

  const fullPriceCents = benefits?.fullPriceCents ?? basePriceCents;
  const currency = benefits?.currencyCode ?? currencyCode;

  const noteText = (option: BenefitOption): string | null => {
    switch (option.note?.key) {
      case "ALLOWANCE_UNIT":
        return bp.benefitAllowanceNote.replace("{count}", String(option.note.remaining));
      case "PLAN_CREDIT":
        return bp.benefitPlanCreditNote.replace("{count}", String(option.note.remaining));
      case "ALLOWANCE_EXHAUSTED":
        return bp.benefitAllowanceExhausted;
      case "INSURANCE_DEFERRED":
        return bp.benefitInsuranceNote;
      default:
        return null;
    }
  };

  return (
    <div className="grid gap-6">
      <BookingSectionHeader eyebrow={bp.stepBenefit} title={bp.benefitTitle} description={bp.benefitDesc} />
      <div className="gh2-glass-forest gh2-dark-content min-w-0 p-5 sm:p-6">
        <ul className="grid gap-3">
          {options.map((option) => (
            <li key={`${option.source}:${option.refId}`}>
              <Link
                href={hrefFor(`${option.source.toLowerCase()}:${option.refId}`)}
                className="gh2-choice-card flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] p-4 transition hover:border-[var(--color-brand-accent)]"
              >
                {option.source === "INSURANCE" ? (
                  <ShieldCheck className="size-5 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
                ) : (
                  <Sparkles className="size-5 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {option.label}
                    </span>
                    {option.recommended ? (
                      <span className="rounded-full bg-[var(--color-brand-accent)]/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-accent)]">
                        {bp.benefitRecommended}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm text-[var(--color-text-muted)]">
                    {formatPriceRounded(option.unitPriceCents, currency)}
                  </span>
                  {noteText(option) ? (
                    <span className="mt-1 block text-[13px] text-[var(--color-text-muted)]">
                      {noteText(option)}
                    </span>
                  ) : null}
                  {option.indicative ? (
                    <span className="mt-1 block text-[13px] text-[var(--color-text-muted)]">
                      {bp.benefitIndicative}
                    </span>
                  ) : null}
                </span>
                <ArrowRight className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={hrefFor("none")}
              className="gh2-choice-card flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] p-4 transition hover:border-[var(--color-brand-accent)]"
            >
              <UserRound className="size-5 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[var(--color-text-primary)]">
                  {bp.benefitNone}
                </span>
                <span className="block text-sm text-[var(--color-text-muted)]">
                  {fullPriceCents != null ? formatPriceRounded(fullPriceCents, currency) : bp.benefitNoneDesc}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
            </Link>
          </li>
        </ul>
        {benefits ? null : (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            {bp.benefitGuestPrompt}{" "}
            <Link href={loginHref} className="font-semibold underline">
              {bp.benefitGuestCta}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
