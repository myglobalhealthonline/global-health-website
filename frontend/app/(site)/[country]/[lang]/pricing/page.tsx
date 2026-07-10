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
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getServerSubscription } from "@/lib/api/me-subscription-server";
import { SITE_NAME } from "@/lib/constants";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { interpolate } from "@/lib/subscription/format";
import { PricingPlanCard } from "./_components/PricingPlanCard";
import { Stethoscope, Calendar, ShieldCheck, CreditCard, Zap, BadgeCheck } from "lucide-react";
import { DoctifyWidgetLazy as DoctifyWidget } from "@/components/sections/DoctifyReviewsLazy";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countryLangParams();
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const { subscription } = loadLocaleBundle(lang as LocaleCode);
  const url = `${getSiteUrl()}/${country}/${lang}/pricing`;
  const title = `${subscription.pricing.heading} · ${config.name} · ${SITE_NAME}`;
  const description = subscription.pricing.lede.replace("{country}", config.name);
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/pricing") },
    openGraph: { type: "website", siteName: SITE_NAME, url, title, description },
  };
}

/** Auth-aware subscribe CTA (D15 — no guest). Logged-in patients go straight to
 *  the confirm screen; anonymous visitors are routed to login and resumed back
 *  onto the same subscribe action via `?next`. Country + lang ride along so the
 *  account-area confirm screen can resolve the plan from the right catalogue. */
function subscribeHref(
  planId: string,
  countryCode: string,
  lang: string,
  isAuthenticated: boolean,
  returnTo?: string,
): string {
  const base = `/account/subscribe?plan=${encodeURIComponent(planId)}&country=${encodeURIComponent(countryCode)}&lang=${encodeURIComponent(lang)}`;
  // `returnTo` (e.g. the cart) rides through so the post-payment Stripe redirect
  // lands back in the checkout funnel with benefits applied (§6c).
  const target = returnTo ? `${base}&returnTo=${encodeURIComponent(returnTo)}` : base;
  return isAuthenticated ? target : `/login?next=${encodeURIComponent(target)}`;
}

/** Accept only safe in-site relative paths for a post-subscribe return. */
function safeReturnTo(value: string | undefined): string | undefined {
  return value && /^\/[a-zA-Z0-9/_-]*$/.test(value) ? value : undefined;
}

export default async function PricingPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const [{ country: slug, lang }, { returnTo: returnToRaw }] = await Promise.all([params, searchParams]);
  const returnTo = safeReturnTo(returnToRaw);
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

  const [plans, user, sub] = await Promise.all([
    getCountryPlans(code, lang),
    getServerAuthUser(),
    getServerSubscription(),
  ]);
  const isAuthenticated = Boolean(user);
  // Mark the active plan only when the subscription is live AND belongs to the
  // country being viewed (plans are per-country, so a sub elsewhere must not
  // flag a card or block a purchase here). PAST_DUE still counts as "current".
  const activeSub =
    sub &&
    (sub.status === "ACTIVE" || sub.status === "PAST_DUE") &&
    sub.countryCode?.toLowerCase() === code.toLowerCase()
      ? sub
      : null;
  const activePlanId = activeSub?.plan?.id ?? null;
  const hasActiveSub = Boolean(activeSub);
  const { subscription } = loadLocaleBundle(lang as LocaleCode);
  const t = subscription.pricing;
  const hiw = subscription.howItWorks;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: t.heading, url: `/${slug}/${lang}/pricing` },
        ])}
      />

      <PageHero
        watermark={t.watermark}
        countryCode={config.code}
        countryLabel={t.countryLabel.replace("{country}", config.name)}
        titleLead={t.titleLead}
        titleAccent={t.titleAccent}
        titleTrail={t.titleTrail}
        lede={t.lede.replace("{country}", config.name)}
        ctaLabel={t.ctaLabel}
        ctaHref="#plans"
        secondaryLabel={t.secondaryLabel}
        secondaryHref={`/${slug}/${lang}/doctors`}
        rightSlot={<PlansArchPanel countryName={config.name} />}
        mobileBgSrc="/images/stock/plans.webp"
        trustCards={[
          {
            icon: <Stethoscope className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: "Licensed doctors",
            subtitle: "Registered locally",
          },
          {
            icon: <Calendar className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: "Flexible plans",
            subtitle: "Cancel anytime",
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: "Secure payments",
            subtitle: "Stripe protected",
          },
        ]}
      />

      <section
        id="plans"
        className="scroll-mt-24 gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-pricing"
      >
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
            <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PricingPlanCard
                  key={plan.id}
                  plan={plan}
                  t={t}
                  note={subscription.note}
                  ctaHref={subscribeHref(plan.id, code, lang, isAuthenticated, returnTo)}
                  isCurrentPlan={plan.id === activePlanId}
                  hasActiveSub={hasActiveSub}
                  // "Switch to this plan" lands on the manage panel with the
                  // target preselected; the current plan's card just manages.
                  manageHref={
                    plan.id === activePlanId
                      ? "/account/membership"
                      : `/account/membership?plan=${encodeURIComponent(plan.id)}`
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-14 max-w-xl rounded-[var(--radius-card)] border border-[var(--color-border)] gh2-glass-forest p-10 text-center">
              <h3
                className="text-[1.4rem] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]"
              >
                {t.empty.title.replace("{country}", config.name)}
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
      <section className="border-t border-[var(--color-border)] gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <DoctifyWidget variant="horizontal" language={lang} />
        </div>
      </section>

      {/* How it works — 5-step onboarding overview (subscriptions are IE-only). */}
      <section className="gh2-section-forest gh-medical-pattern gh-medical-pattern-dark gh-inline-clamp-section-pricing">
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

function PlansArchPanel({ countryName }: { countryName: string }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage
        src="/images/stock/plans.webp"
        alt={`Doctor reviewing health subscription plans in ${countryName}`}
      />

      {/* Floating — Monthly care */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[12%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0s]"
      >
        <Zap className="size-5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">Monthly care</span>
          <span className="block text-[11.5px] leading-tight text-white/55">Renew or cancel anytime</span>
        </span>
      </div>

      {/* Floating — Secure payments */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-4 top-[56%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:1.4s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <CreditCard className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">Secure payments</span>
          <span className="block text-[11.5px] leading-tight text-white/55">Stripe protected</span>
        </span>
      </div>

      {/* Floating — Licensed doctors */}
      <div
        className="gh-glass-emerald gh-floaty absolute -left-8 bottom-[5%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0.7s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">Licensed doctors</span>
          <span className="block text-[11.5px] leading-tight text-white/55">Registered in {countryName}</span>
        </span>
      </div>
    </div>
  );
}
