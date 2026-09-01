import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd, subscriptionPlanServiceJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryPlansResult } from "@/lib/content/get-country-plans";
import { SITE_NAME } from "@/lib/constants";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { interpolate } from "@/lib/subscription/format";
import { PricingPlansGrid } from "./_components/PricingPlansGrid";
import { Stethoscope, Calendar, ShieldCheck, CreditCard, Zap, BadgeCheck } from "lucide-react";
import { DoctifyWidgetLazy as DoctifyWidget } from "@/components/sections/DoctifyReviewsLazy";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { irelandStaticPageSeo } from "@/lib/content/ireland-static-page-seo";
import { czechiaStaticPageSeo } from "@/lib/content/czechia-static-page-seo";
import { portugalStaticPageSeo } from "@/lib/content/portugal-static-page-seo";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countryLangParams();
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? await getPublicCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const { subscription, common } = loadLocaleBundle(lang as LocaleCode);
  const countryName = common.countryNames?.[code] ?? config.name;
  const irelandSeo = code === "ie" ? irelandStaticPageSeo("PRICING", lang as LocaleCode) : null;
  const czechiaSeo = czechiaStaticPageSeo(code, lang, "pricing");
  const portugalPlans = code === "pt" && isCountryFeatureEnabled(config, "subscriptions")
    ? await getCountryPlansResult(code, lang)
    : null;
  const portugalSeo = portugalPlans?.ok && portugalPlans.plans.length === 0
    ? portugalStaticPageSeo(code, lang, "pricing")
    : null;

  const title = czechiaSeo?.title ?? portugalSeo?.title ?? irelandSeo?.title ?? `${subscription.pricing.heading} · ${countryName} · ${SITE_NAME}`;
  const description =
    czechiaSeo?.description ?? portugalSeo?.description ?? irelandSeo?.description ?? subscription.pricing.lede.replace("{country}", countryName);
  return buildPublicMetadata({
    path: `/${country}/${lang}/pricing`,
    title,
    description,
    locale: ogLocales(config, lang).locale,
    kind: "pricing",
    subtitle: countryName,
    imageAlt: `${title} — ${countryName}`,
    languages: hreflangAlternates(config, "/pricing"),
  });
}

/**
 * P-001: this page is statically generated, so it must not read `cookies()`
 * or `searchParams`. The visitor-specific bits — "your current plan", the
 * switch-vs-subscribe CTA, and the `?returnTo` passthrough — live in
 * <PricingPlansGrid>, a client island. The plan catalogue below is identical
 * for every visitor and stays prerendered.
 */
export default async function PricingPage({ params }: { params: Promise<Params> }) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  // STRICT subscriptions gate (§36.15). isCountryFeatureEnabled special-cases
  // this key: enabled ONLY when explicitly present in enabledFeatures (never
  // the "empty = on" fallback). Backend defends the same gate (404).
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "subscriptions")) notFound();

  const planResult = await getCountryPlansResult(code, lang);
  if (!planResult.ok) notFound();
  const plans = planResult.plans;
  const { subscription, common: c } = loadLocaleBundle(lang as LocaleCode);
  const countryName = c.countryNames?.[code] ?? config.name;
  const t = subscription.pricing;
  const hiw = subscription.howItWorks;
  const pp = c.pricingPage;
  const irelandSeo = code === "ie" ? irelandStaticPageSeo("PRICING", lang as LocaleCode) : null;
  const czechiaSeo = czechiaStaticPageSeo(code, lang, "pricing");
  const portugalSeo = plans.length === 0 ? portugalStaticPageSeo(code, lang, "pricing") : null;
  const marketSeo = czechiaSeo ?? portugalSeo ?? irelandSeo;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: countryName, url: `/${slug}/${lang}` },
          { name: t.heading, url: `/${slug}/${lang}/pricing` },
        ])}
      />
      {/* Product + Offer per plan tier — sourced from the same `plans` fetch
          the cards below render, so schema price never drifts from the page. */}
      {plans.length > 0 ? (
        <JsonLd
          data={plans.map((plan) =>
            subscriptionPlanServiceJsonLd({
              name: plan.name,
              description: plan.shortDescription,
              url: `/${slug}/${lang}/pricing`,
              countryName: config.name,
              priceCents: plan.monthlyPriceCents,
              currencyCode: plan.currencyCode,
            }),
          )}
        />
      ) : null}

      <PageHero
        watermark={t.watermark}
        countryCode={config.code}
        countryLabel={t.countryLabel.replace("{country}", countryName)}
        titleLead={marketSeo?.h1 ?? t.titleLead}
        titleAccent={marketSeo ? "" : t.titleAccent}
        titleTrail={marketSeo ? "" : t.titleTrail}
        lede={portugalSeo?.lede ?? t.lede.replace("{country}", countryName)}
        ctaLabel={t.ctaLabel}
        ctaHref="#plans"
        secondaryLabel={t.secondaryLabel}
        secondaryHref={`/${slug}/${lang}/doctors`}
        rightSlot={<PlansArchPanel countryName={countryName} i18n={t} />}
        mobileBgSrc="/images/stock/plans.webp"
        trustCards={[
          {
            icon: <Stethoscope className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: pp.trustLicensedTitle,
            subtitle: pp.trustLicensedSubtitle,
          },
          {
            icon: <Calendar className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: pp.trustFlexibleTitle,
            subtitle: pp.trustFlexibleSubtitle,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: pp.trustSecureTitle,
            subtitle: pp.trustSecureSubtitle,
          },
        ]}
      />

      <section
        id="plans"
        className="scroll-mt-24 gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-pricing"
      >
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]"
            >
              {t.eyebrow}
            </p>
            <h2
              className="mt-3 text-[clamp(2rem,4vw+0.5rem,3.25rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-[var(--color-text-primary)]"
            >
              {t.heading}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-text-muted)]">
              {t.subheading}
            </p>
          </div>

          {plans.length > 0 ? (
            <PricingPlansGrid
              plans={plans}
              t={t}
              note={subscription.note}
              countryCode={code}
              lang={lang}
            />
          ) : (
            <div className="mx-auto mt-14 max-w-xl rounded-[var(--radius-card)] border border-[var(--color-border)] gh2-glass-forest p-10 text-center">
              <h3
                className="text-[1.4rem] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]"
              >
                {t.empty.title.replace("{country}", countryName)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {t.empty.body}
              </p>
              <Link
                href={`/${slug}/${lang}/doctors`}
                className="gh-btn gh-btn-primary mt-7 inline-flex justify-center"
              >
                {t.empty.cta}
              </Link>
            </div>
          )}


        </div>
      </section>

      {/* Doctify social proof — verified patient ratings above the fold-out steps */}
      <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <DoctifyWidget variant="horizontal" language={lang} />
        </div>
      </section>

      {/* How it works — 5-step onboarding overview (subscriptions are IE-only). */}
      <section className="gh2-section-forest gh-medical-pattern gh-medical-pattern-dark gh-inline-clamp-section-pricing">
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]"
            >
              {hiw.eyebrow}
            </p>
            <h2
              className="mt-3 text-[clamp(2rem,4vw+0.5rem,3.25rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-white"
            >
              {hiw.title}
            </h2>
            <p className="mt-3 text-lg font-semibold text-[var(--color-brand-accent)]">
              {hiw.subtitle}
            </p>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              {hiw.lede}
            </p>
            <span
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--color-brand-accent)]" />
              {hiw.availability}
            </span>
          </div>

          <ol className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-y-12 lg:grid-cols-5 lg:gap-x-6">
            {hiw.steps.map((step, i) => {
              const last = i === hiw.steps.length - 1;
              return (
                <li key={i} className="group relative flex flex-col items-center px-2 text-center">
                  {/* Connector rail — horizontal on desktop, vertical on mobile.
                      Sits behind the node; the node's bg-coloured ring masks it. */}
                  {!last ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-7 hidden h-px w-[calc(100%+1.5rem)] bg-white/15 lg:block"
                      />
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-14 -bottom-12 block w-px -translate-x-1/2 bg-white/15 lg:hidden"
                      />
                    </>
                  ) : null}

                  <span
                    className="relative z-10 flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-primary)_0%,#2A6B4E_100%)] text-base font-extrabold text-[var(--color-brand-accent)] shadow-[0_0_0_4px_#12342A,0_8px_18px_-8px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-110"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <p
                    className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]"
                  >
                    {interpolate(hiw.stepLabel, { n: i + 1 })}
                  </p>
                  <h3
                    className="mt-2 text-[1.0625rem] font-bold leading-[1.3] tracking-[-0.01em] text-white"
                  >
                    {step.title}
                  </h3>
                  <p
                    className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-white/70 lg:max-w-none"
                  >
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}

type PlansArchPanelI18n = {
  archMonthlyCareTitle: string;
  archMonthlyCareSubtitle: string;
  archSecurePaymentsTitle: string;
  archSecurePaymentsSubtitle: string;
  archLicensedTitle: string;
  archLicensedSubtitleTemplate: string;
  /** "{country}" placeholder. Alt text for the hero collage image. */
  archImageAltTemplate: string;
};

function PlansArchPanel({ countryName, i18n }: { countryName: string; i18n: PlansArchPanelI18n }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage
        src="/images/stock/plans.webp"
        alt={i18n.archImageAltTemplate.replace("{country}", countryName)}
      />

      {/* Floating — Monthly care */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[12%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <Zap className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{i18n.archMonthlyCareTitle}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{i18n.archMonthlyCareSubtitle}</span>
        </span>
      </div>

      {/* Floating — Secure payments */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[56%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:1.4s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <CreditCard className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{i18n.archSecurePaymentsTitle}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{i18n.archSecurePaymentsSubtitle}</span>
        </span>
      </div>

      {/* Floating — Licensed doctors */}
      <div
        className="gh-glass-emerald gh-floaty absolute -left-6 bottom-[5%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0.7s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{i18n.archLicensedTitle}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">
            {i18n.archLicensedSubtitleTemplate.replace("{country}", countryName)}
          </span>
        </span>
      </div>
    </div>
  );
}
