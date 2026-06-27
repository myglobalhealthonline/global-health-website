import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Clock, MapPin, Lock, ArrowRight, Users } from "lucide-react";
import { Flag } from "@/components/ui/Flag";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { countries, getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPublicPage,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-public-page";
import { getCountryHealthTests } from "@/lib/content/get-country-collections";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { CartServiceCard } from "@/components/cards/CartServiceCard";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({
    country: COUNTRY_CODE_TO_SLUG[c.code],
    lang: (c.defaultLocale ?? "EN").toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };
  // Admin-editable copy via /admin/pages (PageKey=HEALTH_TESTS).
  // Falls back to the hardcoded strings if no ContentPage row exists.
  const { record: page } = await getPublicPage(code, "HEALTH_TESTS", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/lab-tests`;
  const title = page?.seoTitle ?? `Lab Test Booking in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ?? `Lab-quality home health tests delivered in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/lab-tests") },
    openGraph: { type: "website", siteName: SITE_NAME, url, title, description },
  };
}

function formatPrice(cents: number, currency: string) {
  return formatPriceRounded(cents, currency);
}

export default async function HealthTestsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  // Honor the per-country `health-tests` toggle from /admin/country-features.
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "health-tests")) notFound();
  const [items, { record: rawPage, disabled: pageDisabled }] = await Promise.all([
    getCountryHealthTests(code, lang),
    getPublicPage(code, "HEALTH_TESTS", lang as PublicLocale),
  ]);

  const page = (pageDisabled || !isCountryFeatureEnabled(overlay, "pages")) ? null : rawPage;
  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const t = c.testsPage;
  // Cart-first booking: hero/final CTA points at the tests grid below.
  const bookHref = "#tests";
  // Provider-first defaults per Google Ads "restricted services" guidance.
  // Lab-test pages also fall under restricted scope when copy emphasises
  // the kit/sample/process. Anchor on the reviewing clinician instead.
  const heroSubtitle =
    page?.heroSubtitle ?? t.heroSubtitle.replace("{country}", config.name);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Lab tests", url: `/${slug}/${lang}/lab-tests` },
        ])}
      />

      {/* ── Hero — viewport-locked 50/50: image left, content right ── */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{ background: "#031F18", height: "calc(100svh - var(--header-height))", minHeight: 620 }}
      >
        <div className="grid h-full lg:grid-cols-2">

          {/* LEFT — full-bleed lab tests image */}
          <div className="relative h-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/stock/tests.jpg"
              alt={`Lab-quality home health test results reviewed by a doctor in ${config.name}`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
            />
            {/* Green wash */}
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "rgba(3,31,24,0.20)", mixBlendMode: "multiply" }} />
            {/* Bottom vignette */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "50%", background: "linear-gradient(to top, rgba(3,31,24,0.88) 0%, rgba(3,31,24,0.30) 50%, transparent 100%)" }} />
            {/* Right-edge bleed */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block" style={{ width: "44%", background: "linear-gradient(to right, transparent 0%, rgba(3,31,24,0.60) 45%, rgba(3,31,24,0.92) 75%, #031F18 100%)" }} />
          </div>

          {/* RIGHT — content */}
          <div
            className="relative flex h-full flex-col justify-center overflow-y-auto px-8 py-6 md:px-12 lg:px-14 lg:py-8"
            style={{ background: "#031F18" }}
          >
            {/* 1 — gradient depth */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ background: "radial-gradient(circle at 88% 14%, rgba(22,89,64,0.30), transparent 42%),radial-gradient(circle at 12% 88%, rgba(2,18,13,0.55), transparent 44%),linear-gradient(135deg, #062b21 0%, #031F18 50%, #02140e 100%)" }} />
            {/* 2 — technical lime grid */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: "linear-gradient(rgba(176,241,34,0.045) 1px, transparent 1px),linear-gradient(90deg, rgba(176,241,34,0.045) 1px, transparent 1px)", backgroundSize: "52px 52px", maskImage: "radial-gradient(130% 130% at 80% 18%, #000 0%, rgba(0,0,0,0.40) 52%, transparent 88%)", WebkitMaskImage: "radial-gradient(130% 130% at 80% 18%, #000 0%, rgba(0,0,0,0.40) 52%, transparent 88%)" }} />
            {/* 3 — dot texture */}
            <div aria-hidden className="gh-dot-grid pointer-events-none absolute inset-0 z-0" style={{ opacity: 0.55, maskImage: "radial-gradient(700px 540px at 86% 12%, #000 0%, transparent 70%)", WebkitMaskImage: "radial-gradient(700px 540px at 86% 12%, #000 0%, transparent 70%)" }} />
            {/* 4 — lime ambient glow */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 560px 480px at 72% 64%, rgba(176,241,34,0.10), transparent 62%),radial-gradient(ellipse 640px 540px at 112% -8%, rgba(176,241,34,0.11), transparent 60%)" }} />
            {/* 5 — faint plus symbols */}
            <span aria-hidden className="pointer-events-none absolute z-0 select-none font-bold leading-none" style={{ top: "-2%", right: "5%", fontSize: "190px", color: "rgba(176,241,34,0.055)" }}>+</span>
            <span aria-hidden className="pointer-events-none absolute z-0 select-none font-bold leading-none" style={{ bottom: "8%", right: "10%", fontSize: "78px", color: "rgba(176,241,34,0.045)" }}>+</span>

            {/* Content */}
            <div className="relative z-10" style={{ maxWidth: 660 }}>

              {/* Eyebrow pill */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{ background: "rgba(3,28,22,0.75)", border: "1px solid rgba(176,241,34,0.22)", color: "rgba(245,255,248,0.80)" }}
                >
                  <Flag code={config.code} size="sm" />
                  {t.countryLabel.replace("{country}", config.name)}
                </span>
              </div>

              {/* Title */}
              <h1
                className="font-extrabold leading-[1.02] tracking-[-0.038em]"
                style={{ fontSize: "clamp(1.9rem, 2.2vw + 0.9rem, 3.4rem)", color: "#F5FFF8", maxWidth: "16ch" }}
              >
                {t.titleLead}{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>{t.titleAccent}</span>
                {t.titleTrail ? <span>{` ${t.titleTrail}`}</span> : null}
              </h1>

              {/* Lede */}
              <p
                className="mt-3 leading-relaxed"
                style={{ maxWidth: "46ch", fontSize: "clamp(0.9rem, 0.6vw + 0.65rem, 1.05rem)", color: "#B8C9C2" }}
              >
                {heroSubtitle}
              </p>

              {/* Trust row */}
              <div className="mt-4 flex flex-wrap items-center gap-y-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
                {[
                  { icon: ShieldCheck, label: t.hero.feature1Title },
                  { icon: Clock, label: t.hero.feature2Title },
                  { icon: MapPin, label: t.hero.feature3Title.replace("{country}", config.name) },
                ].map(({ icon: Icon, label }, i) => (
                  <span key={label} className="flex items-center">
                    {i > 0 ? <span aria-hidden className="mx-4 hidden h-4 w-px sm:block" style={{ background: "rgba(255,255,255,0.14)" }} /> : null}
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.68)" }}>
                      <Icon className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.75} aria-hidden />
                      {label}
                    </span>
                  </span>
                ))}
              </div>

              {/* Feature cards */}
              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[
                  { icon: <ShieldCheck className="size-[17px]" strokeWidth={2} aria-hidden />, title: t.hero.feature1Title, subtitle: t.hero.feature1Subtitle },
                  { icon: <Clock className="size-[17px]" strokeWidth={2} aria-hidden />, title: t.hero.feature2Title, subtitle: t.hero.feature2Subtitle },
                  { icon: <MapPin className="size-[17px]" strokeWidth={2} aria-hidden />, title: t.hero.feature3Title.replace("{country}", config.name), subtitle: t.hero.feature3Subtitle.replace("{country}", config.name) },
                ].map((card) => (
                  <li key={card.title} className="gh-glass-emerald rounded-2xl px-3.5 py-3">
                    <span className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--color-brand-accent)]" style={{ background: "rgba(176,241,34,0.12)" }}>
                      {card.icon}
                    </span>
                    <span className="mt-2 block text-[13px] font-bold leading-tight text-white">{card.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-white/55">{card.subtitle}</span>
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={bookHref}
                  className="gh2-btn-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,241,34,0.45)]"
                >
                  {t.ctaLabel}
                  <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
                </Link>
                <Link
                  href={`/${slug}/${lang}/doctors`}
                  className="gh2-btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {t.secondaryLabel}
                  <Users className="size-4" strokeWidth={1.75} aria-hidden />
                </Link>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Trust signals immediately under the hero, then straight into
          the product grid — supporting copy moves below the offer. */}
      <TrustRibbon
        items={[
          { v: t.trustLabQualityValue, l: t.trustLabQualityLabel, icon: "sparkles" },
          { v: t.trustDoctorValue, l: t.trustDoctorLabel, icon: "doctor" },
          { v: t.trustHomeValue, l: t.trustHomeLabel, icon: "shield" },
          { v: t.trustGdprValue, l: t.trustGdprLabel, icon: "lock" },
        ]}
      />

      {items.length > 0 ? (
        <section
          id="tests"
          className="scroll-mt-24 relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
          style={{
            background: "var(--color-background-dark)",
            padding: "clamp(64px,8vw,120px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-accent)" }}
            >
              {t.reviewedEyebrow}
            </p>
            <h2
              className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {t.availableHeading
                .replace("{count}", String(items.length))
                .replace("{unit}", items.length === 1 ? t.testSingular : t.testPlural)}
            </h2>
            <div className="mt-12 gh-card-grid">
              {items.map((t) => {
                const soldOut = t.stock !== null && t.stock <= 0;
                const lowStock = !soldOut && t.stock !== null && t.stock <= 5 ? t.stock : null;
                const priceLabel = formatPrice(t.priceCents, t.currencyCode);
                return (
                  <CartServiceCard
                    key={t.id}
                    kind="HEALTH_TEST"
                    healthTestId={t.id}
                    title={t.title}
                    description={t.shortDescription}
                    imageSrc={t.imageSrc}
                    sampleType={t.sampleType}
                    resultsTimeline={t.resultsTimeline}
                    startingPrice={priceLabel}
                    ctaLabel={`Add to cart · ${priceLabel}`}
                    detailHref={`/${slug}/${lang}/tests/${t.slug}`}
                    soldOut={soldOut}
                    lowStock={lowStock}
                    iconVariant="flask"
                  />
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section
          className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
          style={{
            background: "var(--color-background-dark)",
            padding: "clamp(48px,6vw,80px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-3xl px-5 md:px-10 text-center">
            <p style={{ color: "rgba(255,255,255,0.55)" }}>
              {t.comingSoon.replace("{country}", config.name)}
            </p>
          </div>
        </section>
      )}

      {/* Admin-edited rich body from ContentPage (HEALTH_TESTS). */}
      <RichBodySection html={page?.body} theme="light" />

      <FinalCTA primaryHref={bookHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
