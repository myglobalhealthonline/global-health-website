import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getServerSubscription } from "@/lib/api/me-subscription-server";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { formatPrice } from "@/lib/format-currency";
import { formatPerkUnlockNote, interpolate, pluralTemplate } from "@/lib/subscription/format";
import { PageHeader } from "@/components/portal-atoms";
import { SubscribeForm } from "./_components/SubscribeForm";

export const metadata: Metadata = { title: "Confirm membership", robots: { index: false } };

type Search = { plan?: string; country?: string; lang?: string; returnTo?: string };

/** Accept only safe in-site relative paths for a post-subscribe return (§6c). */
function safeReturnTo(value: string | undefined): string | undefined {
  return value && /^\/[a-zA-Z0-9/_-]*$/.test(value) ? value : undefined;
}

export default async function SubscribeConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { plan: planId, country: countryParam, lang: langParam, returnTo: returnToRaw } = await searchParams;
  const returnTo = safeReturnTo(returnToRaw);

  // If the patient is already actively subscribed, send them to manage instead
  // of letting them start a second membership (one active sub per user).
  const existing = await getServerSubscription();
  if (existing && (existing.status === "ACTIVE" || existing.status === "PAST_DUE")) {
    redirect("/account/plans?subscription=already-active");
  }

  const pageLocale = await getPortalLocale();
  const locale: LocaleCode =
    langParam && isSupportedLocale(langParam) ? (langParam as LocaleCode) : pageLocale;
  const { subscription } = loadLocaleBundle(locale);
  const t = subscription.subscribe;

  // Resolve the chosen plan from its country catalogue (planId is globally
  // unique, but plans are per-country so we need the country to localize).
  const code = countryParam ? countryCodeFromSlug(countryParam) ?? countryParam.toLowerCase() : null;
  const plans = code ? await getCountryPlans(code, locale) : [];
  const plan = planId ? plans.find((p) => p.id === planId) ?? null : null;

  if (!plan) {
    return (
      <div className="gh-patient-page gh-patient-subscribe-page">
        <PageHeader title={t.title} description={t.subtitle} />
        <div className="gh-patient-empty-state gh-card max-w-xl p-8 text-center">
          <p className="text-sm" style={{ color: "var(--portal-muted)" }}>
            {t.missingPlan}
          </p>
          <Link href="/account" className="gh-btn gh-btn-primary mt-6 inline-flex justify-center">
            {t.backToPlans}
          </Link>
        </div>
      </div>
    );
  }

  const pricing = subscription.pricing;
  const priceLabel = formatPrice(plan.monthlyPriceCents, plan.currencyCode, { maximumFractionDigits: 0 });
  const credits = plan.monthlyConsultationCredits;
  const wellness = plan.wellnessCreditsPerMonth;
  // Data-driven benefit-unlock note (D25) — "benefits unlock after N paid
  // months". perkUnlockMonths now reflects the plan-level floor (issue #10).
  const unlockNote = formatPerkUnlockNote(plan.perkUnlockMonths, subscription.note);
  const features = [
    interpolate(pluralTemplate(credits, pricing.creditLabel, pricing.creditsLabel), { count: credits }),
    pricing.secureLine,
    pricing.bookingLine,
    pricing.specialistLine,
    ...(wellness > 0
      ? [
          interpolate(pluralTemplate(wellness, pricing.wellnessLabelSingular, pricing.wellnessLabel), {
            count: wellness,
          }),
          pricing.wellnessRedeemLine,
        ]
      : []),
    ...(unlockNote ? [unlockNote] : []),
  ];

  const config = code ? getCountryByCode(code) : null;
  const langSlug = locale;
  const termsHref =
    config && langSlug ? `/${config.slug}/${langSlug}/legal/subscription-terms` : "/legal/subscription-terms";

  return (
    <div className="gh-patient-page gh-patient-subscribe-page">
      <PageHeader title={t.title} description={t.subtitle} />
      <SubscribeForm
        planId={plan.id}
        planName={plan.name}
        priceLabel={priceLabel}
        perMonth={pricing.perMonth}
        billedMonthly={t.billedMonthly}
        whatYouGet={t.whatYouGet}
        features={features}
        consentLabel={t.consentLabel}
        consentRequired={t.consentRequired}
        termsLink={t.termsLink}
        termsHref={termsHref}
        submitLabel={t.submit}
        submittingLabel={t.submitting}
        secureNote={t.secureNote}
        errorLabel={t.error}
        planSummaryLabel={t.planSummary}
        returnTo={returnTo}
      />
    </div>
  );
}
