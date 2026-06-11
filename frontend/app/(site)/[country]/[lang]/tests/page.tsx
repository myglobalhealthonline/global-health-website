import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { PageHero } from "@/components/sections/PageHero";
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
import { ProcessStepsSection } from "@/components/sections/ServiceContentSections";
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
  const td = c.testDetailPage;
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

      <PageHero
        watermark={t.watermark}
        countryCode={config.code}
        countryLabel={t.countryLabel.replace("{country}", config.name)}
        titleLead={t.titleLead}
        titleAccent={t.titleAccent}
        titleTrail={t.titleTrail}
        lede={heroSubtitle}
        ctaLabel={t.ctaLabel}
        ctaHref={bookHref}
        secondaryLabel={t.secondaryLabel}
        secondaryHref={`/${slug}/${lang}/doctors`}
        heroImage={{
          src: "/images/stock/tests.jpg",
          alt: `Lab-quality home health test results reviewed by a doctor in ${config.name}`,
          priority: true,
        }}
      />

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

      {/* How it works — generic order → sample → results flow, shared
          copy with the test detail pages. */}
      <ProcessStepsSection
        eyebrow={td.howEyebrow}
        title={td.howTitle}
        steps={[
          { title: td.step1Title, body: td.step1Body },
          { title: td.step2Title, body: td.step2Body.replace("{sample}", "") },
          {
            title: td.step3Title,
            body: td.step3Body
              .replace("{country}", config.name)
              .replace("{timeline}", ""),
          },
        ]}
        theme="light"
      />

      {/* Admin-edited rich body from ContentPage (HEALTH_TESTS). */}
      <RichBodySection html={page?.body} theme="light" />

      <FinalCTA primaryHref={bookHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
