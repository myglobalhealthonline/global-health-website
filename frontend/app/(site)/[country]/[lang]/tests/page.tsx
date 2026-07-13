import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Clock, MapPin, Lock } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServiceHero } from "@/components/sections/ServiceHero";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd, catalogueItemListJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPageContent,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-page-content";
import { getCountryHealthTests } from "@/lib/content/get-country-collections";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { CartServiceCard } from "@/components/cards/CartServiceCard";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import {
  ChecklistSection,
  ServiceIntro,
  WhyChooseSection,
} from "@/components/sections/ServiceContentSections";
import { getCountryDisclaimer } from "@/lib/content/get-country-legal";
import { getServiceHubContent } from "@/lib/content/service-hub-content";
import { resolveBrandTitle } from "@/lib/seo/page-seo";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countryLangParams();
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
  const { record: page } = await getPageContent(code, "HEALTH_TESTS", lang as PublicLocale);
  const hub = getServiceHubContent("tests", {
    countryName: config.name,
    locale: lang,
    serviceNames: [],
  });
  const url = `${getSiteUrl()}/${country}/${lang}/lab-tests`;
  const title = page?.seoTitle ?? `${hub.overview.title} · ${config.name}`;
  const description = page?.seoDescription ?? hub.overview.body;
  return {
    title: resolveBrandTitle(title),
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
  const [
    items,
    { record: rawPage, disabled: pageDisabled },
    { short: testsShortDisclaimer },
  ] = await Promise.all([
    getCountryHealthTests(code, lang),
    getPageContent(code, "HEALTH_TESTS", lang as PublicLocale),
    getCountryDisclaimer(code, lang),
  ]);

  // Structured PageContent self-gates via publish status; legacy "pages"
  // country-feature no longer gates it.
  const page = pageDisabled ? null : rawPage;
  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const t = c.testsPage;
  // Cart-first booking: hero/final CTA points at the tests grid below.
  const bookHref = "#tests";
  const hub = getServiceHubContent("tests", {
    countryName: config.name,
    locale: lang,
    serviceNames: items.map((item) => item.title),
  });
  const heroSubtitle = page?.heroSubtitle ?? t.heroSubtitle.replace("{country}", config.name);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Lab tests", url: `/${slug}/${lang}/lab-tests` },
        ])}
      />
      <JsonLd data={faqJsonLd(hub.faq)} />
      {items.length > 0 ? (
        <JsonLd
          data={catalogueItemListJsonLd(
            items.map((item) => ({
              name: item.title,
              url: `/${slug}/${lang}/tests/${item.slug}`,
            })),
          )}
        />
      ) : null}

      <ServiceHero
        countryCode={config.code}
        countryLabel={t.countryLabel.replace("{country}", config.name)}
        titleLead={page?.heroTitle ?? t.titleLead}
        titleAccent={page?.heroTitle ? "" : t.titleAccent}
        titleTrail={page?.heroTitle ? undefined : t.titleTrail}
        lede={heroSubtitle}
        primaryCta={{ label: page?.ctaLabel ?? t.ctaLabel, href: page?.ctaHref ?? bookHref }}
        secondaryCta={{
          label: t.secondaryLabel,
          href: `/${slug}/${lang}/doctors`,
        }}
        heroImage={{
          src: page?.heroImageSrc ?? "/images/stock/tests.jpg",
          alt: hub.overview.title,
          priority: true,
        }}
        badge={{
          title: t.hero.feature1Title,
          subtitle: t.hero.feature2Title,
          accent: t.hero.feature3Title.replace("{country}", config.name),
        }}
        featureCards={[
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.hero.feature1Title,
            subtitle: t.hero.feature1Subtitle,
          },
          {
            icon: <Clock className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.hero.feature2Title,
            subtitle: t.hero.feature2Subtitle,
          },
          {
            icon: <MapPin className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.hero.feature3Title.replace("{country}", config.name),
            subtitle: t.hero.feature3Subtitle.replace("{country}", config.name),
          },
        ]}
        trustStats={[
          {
            icon: <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />,
            title: t.hero.stat1Title,
            subtitle: t.hero.stat1Subtitle,
          },
          {
            icon: <Clock className="size-5" strokeWidth={2} aria-hidden />,
            title: t.hero.stat2Title,
            subtitle: t.hero.stat2Subtitle,
          },
          {
            icon: <Lock className="size-5" strokeWidth={2} aria-hidden />,
            title: t.hero.stat3Title,
            subtitle: t.hero.stat3Subtitle,
          },
        ]}
      />

      {/* Admin-authored structured sections (DB-backed, toggle-gated per
          country). Off by default — additive to the hub copy below, in
          the same GP-hub relative order (Part B.3). */}
      {page?.sections.intro ? <ServiceIntro body={page.intro!} theme="light" /> : null}

      <ServiceIntro body={hub.overview.body} theme="light" />

      {items.length > 0 ? (
        <section
          id="tests"
          className="scroll-mt-24 relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          style={{
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
                    ctaLabel={c.testDetailPage.addToCart.replace("{price}", priceLabel)}
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
          id="tests"
          className="relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          style={{
            padding: "clamp(48px,6vw,80px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-3xl px-5 md:px-10 text-center">
            <h2 className="text-2xl font-extrabold text-white">{hub.emptyState.title}</h2>
            <p className="mt-4" style={{ color: "rgba(255,255,255,0.65)" }}>{hub.emptyState.body}</p>
          </div>
        </section>
      )}

      {page?.sections.whoFor ? (
        <ChecklistSection
          eyebrow="Who it's for"
          title={page.whoForTitle!}
          intro={page.whoForIntro ?? undefined}
          items={page.whoForItems}
          theme="light"
        />
      ) : null}
      <ChecklistSection {...hub.whoFor} theme="light" />

      {page?.sections.whyChoose ? (
        <WhyChooseSection title={page.whyChooseTitle!} items={page.whyChooseItems} theme="soft" />
      ) : null}
      <WhyChooseSection title={hub.whyChoose.title} items={hub.whyChoose.items} theme="soft" />

      <RichBodySection html={page?.body} theme="light" />

      {page?.sections.faq ? <FAQSection title={t.watermark} items={page.faq} /> : null}
      <FAQSection title={t.watermark} items={hub.faq} />

      <DoctifyReviewsSection
        theme="ivory"
        variant="carousel"
        language={lang}
        eyebrow="Patient reviews"
        headline="Trusted by patients"
        headlineAccent="across Europe"
        body="Independent, verified reviews collected by Doctify from patients treated by our clinicians."
      />

      <FinalCTA
        primaryHref={bookHref}
        secondaryHref={`/${slug}/${lang}`}
        i18n={{
          eyebrow: t.reviewedEyebrow,
          liveLabel: config.name,
          calendarLine: heroSubtitle,
          headlinePre: t.titleLead,
          headlineAccent: t.titleAccent,
          headlinePost: t.titleTrail,
          body: hub.overview.body,
          primaryCta: t.ctaLabel,
          secondaryCta: t.secondaryLabel,
        }}
      />
      <StickyBookingCTA href={bookHref} label={t.ctaLabel} />
      <section
        className="relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
        style={{ padding: "clamp(28px,4vw,48px) 0" }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <MedicalDisclaimer
            variant="short"
            text={testsShortDisclaimer ?? hub.importantInformation.paragraphs[0]}
          />
        </div>
      </section>

      {page?.sections.disclaimer ? (
        <MedicalDisclaimer paragraphs={page.disclaimerParagraphs} />
      ) : null}
    </>
  );
}
