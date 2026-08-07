import Link from "next/link";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { buildBookHref } from "@/lib/routing/book-href";
import { formatPriceRounded } from "@/lib/format-currency";
import type { InsuranceOption } from "@/lib/content/get-country-collections";
import { BookingSectionHeader } from "./booking-section-header";

type BookT = import("@/lib/i18n/types").CommonLocale["bookPage"];

/**
 * The insurance step (§11.3) — insurance, and only insurance.
 *
 * Memberships, corporate benefits and public plans are chosen in the booking
 * form (§11.2), where the slot is already known so every price is exact.
 * Insurance cannot wait for that: the insurer sets the slot price AND decides
 * which doctors are bookable at all — a doctor joins a network by having a
 * payout row for that (company, service), and the availability query filters on
 * it. Asking after the doctor is picked would mean offering an insurer that
 * silently empties the calendar.
 *
 * Server-rendered and link-driven like every other step in this wizard: the
 * choice rides in `?benefit=insurance:<companyId>` (or `?benefit=none`). It is
 * written to the cart at add-to-cart by the details form, not here — one write
 * path shared with `/consult`, so the two entry points cannot disagree.
 *
 * No login prompt: insurance never needed an account, and the benefits that do
 * are not on this screen.
 */
export function InsuranceStep({
  country,
  lang,
  serviceSlug,
  doctorSlug,
  basePriceCents,
  currencyCode,
  insuranceOptions,
  bp,
}: {
  country: string;
  lang: string;
  serviceSlug: string;
  doctorSlug: string | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  insuranceOptions: InsuranceOption[];
  bp: BookT;
}) {
  const hrefFor = (benefit: string) =>
    buildBookHref({ country, lang, service: serviceSlug, doctor: doctorSlug, benefit });

  return (
    <div className="grid gap-6">
      <BookingSectionHeader
        eyebrow={bp.stepInsurance}
        title={bp.insuranceTitle}
        description={bp.insuranceDesc}
      />
      <div className="gh2-glass-forest gh2-dark-content min-w-0 p-5 sm:p-6">
        <ul className="grid gap-3">
          {insuranceOptions.map((option) => (
            <li key={option.companyId}>
              <Link
                href={hrefFor(`insurance:${option.companyId}`)}
                className="gh2-choice-card flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] p-4 transition hover:border-[var(--color-brand-accent)]"
              >
                <ShieldCheck
                  className="size-5 shrink-0 text-[var(--color-brand-accent)]"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[var(--color-text-primary)]">
                    {option.name}
                  </span>
                  <span className="block text-sm text-[var(--color-text-muted)]">
                    {formatPriceRounded(option.insurancePriceCents, currencyCode)}
                  </span>
                  <span className="mt-1 block text-[13px] text-[var(--color-text-muted)]">
                    {bp.benefitInsuranceNote}
                  </span>
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
                  {bp.insuranceStandard}
                </span>
                <span className="block text-sm text-[var(--color-text-muted)]">
                  {basePriceCents != null
                    ? formatPriceRounded(basePriceCents, currencyCode)
                    : bp.insuranceNone}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
            </Link>
          </li>
        </ul>
        {/* Memberships and plans are not lost, just later — the form asks once
          * the slot is known, so it can show an exact price instead of an
          * indicative one. */}
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">{bp.insuranceBenefitLater}</p>
      </div>
    </div>
  );
}
