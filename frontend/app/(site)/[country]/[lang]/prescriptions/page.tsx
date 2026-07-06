import { DoctifyReviewsSection } from "@/components/sections/DoctifyReviews";
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
import { getCountryServices } from "@/lib/content/get-country-collections";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
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
  // Admin-editable copy via /admin/pages (PageKey=PRESCRIPTIONS).
  // Falls back to the hardcoded strings if no ContentPage row exists.
  const { record: page } = await getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/repeat-prescription-request`;
  const title = page?.seoTitle ?? `Repeat Prescription Request in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Get a prescription online from a licensed doctor in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/repeat-prescription-request") },
    openGraph: { type: "website", siteName: SITE_NAME, url, title, description },
  };
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
    getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale),
  ]);

  const page = (pageDisabled || !isCountryFeatureEnabled(overlay, "pages")) ? null : rawPage;
  const { common: c } = loadLocaleBundle(lang as LocaleCode);
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

      {/* Admin-edited rich body from ContentPage (PRESCRIPTIONS). Hidden
          when no row exists. */}
      <RichBodySection html={page?.body} />

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
          />
        </div>
      ) : (
        <section
          className="relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          style={{
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
    </>
  );
}
