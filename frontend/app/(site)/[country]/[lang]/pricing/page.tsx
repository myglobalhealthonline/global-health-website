import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { countries, getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { COUNTRY_CODE_TO_SLUG, countryCodeFromSlug } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { SITE_NAME } from "@/lib/constants";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { interpolate } from "@/lib/subscription/format";
import { PricingPlanCard } from "./_components/PricingPlanCard";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({
    country: COUNTRY_CODE_TO_SLUG[c.code],
    lang: (c.defaultLocale ?? "EN").toLowerCase(),
  }));
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
function subscribeHref(planId: string, countryCode: string, lang: string, isAuthenticated: boolean): string {
  const target = `/account/subscribe?plan=${encodeURIComponent(planId)}&country=${encodeURIComponent(countryCode)}&lang=${encodeURIComponent(lang)}`;
  return isAuthenticated ? target : `/login?next=${encodeURIComponent(target)}`;
}

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

  const [plans, user] = await Promise.all([getCountryPlans(code, lang), getServerAuthUser()]);
  const isAuthenticated = Boolean(user);
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
      />

      <section
        id="plans"
        className="scroll-mt-24"
        style={{ background: "var(--color-background-soft)", padding: "clamp(64px,8vw,120px) 0" }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-primary)" }}
            >
              {t.eyebrow}
            </p>
            <h2
              className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.04]"
              style={{ fontSize: "clamp(2rem,4vw + 0.5rem,3.25rem)", color: "var(--color-text-primary)" }}
            >
              {t.heading}
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
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
                  ctaHref={subscribeHref(plan.id, code, lang, isAuthenticated)}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-14 max-w-xl rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-page)] p-10 text-center">
              <h3
                className="font-bold tracking-[-0.02em]"
                style={{ fontSize: "1.4rem", color: "var(--color-text-primary)" }}
              >
                {t.empty.title.replace("{country}", config.name)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
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

          <p className="mt-10 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t.onlineOnlyNote}
          </p>
        </div>
      </section>

      {/* How it works — 5-step onboarding overview (subscriptions are IE-only). */}
      <section style={{ background: "var(--color-background-page)", padding: "clamp(64px,8vw,120px) 0" }}>
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-primary)" }}
            >
              {hiw.eyebrow}
            </p>
            <h2
              className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.04]"
              style={{ fontSize: "clamp(2rem,4vw + 0.5rem,3.25rem)", color: "var(--color-text-primary)" }}
            >
              {hiw.title}
            </h2>
            <p className="mt-3 text-lg font-semibold" style={{ color: "var(--color-brand-primary)" }}>
              {hiw.subtitle}
            </p>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {hiw.lede}
            </p>
            <span
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            >
              <span
                aria-hidden
                style={{ width: 6, height: 6, borderRadius: 999, background: "var(--color-brand-accent)" }}
              />
              {hiw.availability}
            </span>
          </div>

          <ol className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hiw.steps.map((step, i) => (
              <li
                key={i}
                className="group relative flex flex-col rounded-[var(--radius-card)] border p-7 transition-transform duration-300 hover:-translate-y-0.5"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background-page)" }}
              >
                <span
                  className="font-extrabold tracking-[-0.04em]"
                  style={{ fontSize: "2.75rem", lineHeight: 1, color: "var(--color-brand-accent)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {interpolate(hiw.stepLabel, { n: i + 1 })}
                </p>
                <h3
                  className="mt-3 font-bold tracking-[-0.01em]"
                  style={{ fontSize: "1.125rem", color: "var(--color-text-primary)" }}
                >
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
