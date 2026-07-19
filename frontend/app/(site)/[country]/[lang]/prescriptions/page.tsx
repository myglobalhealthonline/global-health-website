import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { PageHero } from "@/components/sections/PageHero";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import {
  getPageContent,
  isSupportedLocale,
  themeProp,
  type PublicLocale,
} from "@/lib/content/get-page-content";
import { getCountryServices } from "@/lib/content/get-country-collections";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import {
  ChecklistSection,
  ServiceIntro,
  WhyChooseSection,
} from "@/components/sections/ServiceContentSections";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { SectionSeam } from "@/components/ui/SectionSeam";
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
  const config = code ? await getPublicCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };
  // Admin-editable copy via /admin/pages (PageKey=PRESCRIPTIONS).
  // Falls back to the hardcoded strings if no ContentPage row exists.
  const { record: page } = await getPageContent(code, "PRESCRIPTIONS", lang as PublicLocale);
  const rxMeta = loadLocaleBundle(lang as LocaleCode).common.prescriptionsPage;
  const title = page?.seoTitle ??
    `${rxMeta.titleLead} ${rxMeta.titleAccent} ${rxMeta.titleTrail} · ${config.name}`;
  const description = page?.seoDescription ??
    rxMeta.heroSubtitle.replace("{country}", config.name);
  return buildPublicMetadata({
    path: `/${country}/${lang}/repeat-prescription-request`,
    title,
    description,
    locale: ogLocales(config, lang).locale,
    kind: "service",
    subtitle: config.name,
    sourceImage: page?.ogImageSrc ?? undefined,
    imageAlt: `${title} — ${config.name}`,
    languages: hreflangAlternates(config, "/repeat-prescription-request"),
  });
}

function formatPrice(cents: number | null, currency: string | null): string | undefined {
  if (cents == null) return undefined;
  return formatPriceRounded(cents, currency);
}

function formatDuration(minutes: number | null): string | undefined {
  if (minutes == null) return undefined;
  return `${minutes} min`;
}

export default async function PrescriptionsPage({
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

  // Honor the per-country `online-prescriptions` toggle from /admin/country-features.
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "online-prescriptions")) notFound();
  const [services, { record: rawPage, disabled: pageDisabled }] = await Promise.all([
    getCountryServices(code, "PRESCRIPTION", lang),
    getPageContent(code, "PRESCRIPTIONS", lang as PublicLocale),
  ]);

  // Structured PageContent self-gates via publish status; legacy "pages"
  // country-feature no longer gates it.
  const page = pageDisabled ? null : rawPage;
  const { common: c, services: servicesLocale } = loadLocaleBundle(lang as LocaleCode);
  const t = c.prescriptionsPage;
  const bookHref = "#prescriptions";
  const fallbackHref = `/${slug}/${lang}/doctors`;

  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary ?? "",
    href: `/${slug}/${lang}/services/${encodeURIComponent(s.slug)}`,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));
  // Provider-first defaults per Google Ads "restricted services" guidance.
  // "Get a prescription" / "delivered electronically" copy was flagged
  // as an outcome-claim. Pivot to clinician-led language.
  const heroSubtitle =
    page?.heroSubtitle ?? t.heroSubtitle.replace("{country}", config.name);
  const ctaLabel = page?.ctaLabel ?? t.ctaLabel;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Repeat prescription request", url: `/${slug}/${lang}/repeat-prescription-request` },
        ])}
      />

      <PageHero
        countryCode={config.code}
        countryLabel={t.countryLabel.replace("{country}", config.name)}
        titleLead={t.titleLead}
        titleAccent={t.titleAccent}
        titleTrail={t.titleTrail}
        lede={heroSubtitle}
        ctaLabel={ctaLabel}
        ctaHref={bookHref}
        secondaryLabel={t.secondaryLabel}
        secondaryHref={`/${slug}/${lang}/doctors`}
        heroImage={{
          src: "/images/stock/prescriptions.jpg",
          alt: `Doctor reviewing a repeat prescription request in ${config.name}`,
          priority: true,
        }}
      />

      {/* Admin-authored structured sections (DB-backed, toggle-gated per
          country). Off by default. Order mirrors the GP hub (Part B.3). */}
      {page?.sections.intro ? (
        <ServiceIntro body={page.intro!} theme={themeProp(page?.introTheme, "light")} />
      ) : null}

      <TrustRibbon
        items={[
          { v: t.trustLicensedValue, l: t.trustLicensedLabel, icon: "doctor" },
          { v: t.trustClinicianValue, l: t.trustClinicianLabel, icon: "shield" },
          { v: t.trustGdprValue, l: t.trustGdprLabel, icon: "lock" },
          { v: t.trustEuValue, l: t.trustEuLabel, icon: "globe" },
        ]}
      />

      {serviceItems.length > 0 ? (
        <div id="prescriptions" className="scroll-mt-24">
          <ServicesGrid
            eyebrow={t.practiceAreas}
            title={t.consultationsTitle}
            intro={t.consultationsIntro
              .replace("{count}", String(serviceItems.length))
              .replace("{unit}", serviceItems.length === 1 ? t.consultationSingular : t.consultationPlural)
              .replace("{country}", config.name)}
            items={serviceItems}
            variant="dark"
            previousPageLabel={c.a11y.previousPage}
            nextPageLabel={c.a11y.nextPage}
            learnMoreLabel={servicesLocale.catalog.learnMore}
          />
        </div>
      ) : (
        <section
          className="relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          style={{
            padding: "clamp(48px,6vw,80px) 0",
          }}
        >
          <SectionSeam theme="dark" />
          <div className="mx-auto max-w-3xl px-5 md:px-10 text-center">
            <p style={{ color: "rgba(255,255,255,0.55)" }}>
              {t.comingSoon.replace("{country}", config.name)}
            </p>
          </div>
        </section>
      )}

      {page?.sections.whoFor ? (
        <ChecklistSection
          eyebrow="Who it's for"
          title={page.whoForTitle!}
          intro={page.whoForIntro ?? undefined}
          items={page.whoForItems}
          theme={themeProp(page?.whoForTheme, "light")}
        />
      ) : null}

      {page?.sections.whyChoose ? (
        <WhyChooseSection
          title={page.whyChooseTitle!}
          items={page.whyChooseItems}
          theme={themeProp(page?.whyChooseTheme, "soft")}
        />
      ) : null}

      {page?.sections.faq ? (
        <FAQSection
          title={c.gpPage.faqTitle}
          items={page.faq}
          theme={themeProp(page?.faqTheme, "dark")}
        />
      ) : null}

      <DoctifyReviewsSection
        theme="ivory"
        variant="grid"
        language={lang}
        eyebrow="Patient reviews"
        headline="Trusted by patients"
        headlineAccent="for prescriptions"
        body="Independent, verified reviews collected by Doctify from patients who have used our prescription services."
      />

      <FinalCTA primaryHref={bookHref} secondaryHref={fallbackHref} />

      {page?.sections.disclaimer ? (
        <MedicalDisclaimer
          paragraphs={page.disclaimerParagraphs}
          theme={themeProp(page?.disclaimerTheme, "dark")}
          title={c.a11y.medicalDisclaimer}
        />
      ) : null}
    </>
  );
}
