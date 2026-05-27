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
  const page = await getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/prescriptions`;
  const title = page?.seoTitle ?? `Online prescriptions in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Get a prescription online from a licensed doctor in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/prescriptions") },
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

  const [services, page] = await Promise.all([
    getCountryServices(code, "PRESCRIPTION"),
    getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale),
  ]);
  const bookHref = "#prescriptions";
  const fallbackHref = `/${slug}/${lang}/doctors`;

  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary ?? "",
    href: `/${slug}/${lang}/consult/${encodeURIComponent(s.slug)}`,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));
  // Provider-first defaults per Google Ads "restricted services" guidance.
  // "Get a prescription" / "delivered electronically" copy was flagged
  // as an outcome-claim. Pivot to clinician-led language.
  const heroTitle = page?.heroTitle ?? "Meet doctors handling repeat prescriptions";
  const heroSubtitle =
    page?.heroSubtitle ??
    `Doctors registered to practise in ${config.name} who review repeat prescription requests for established patients.`;
  const ctaLabel = page?.ctaLabel ?? "Meet the doctors";

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
        countryLabel={`${config.name} · Doctors handling repeat prescriptions`}
        titleLead="Meet our"
        titleAccent="licensed"
        titleTrail="prescribers."
        lede={heroSubtitle}
        ctaLabel={ctaLabel}
        ctaHref={bookHref}
        secondaryLabel="Browse all doctors"
        secondaryHref={`/${slug}/${lang}/doctors`}
      />

      {/* Admin-edited rich body from ContentPage (PRESCRIPTIONS). Hidden
          when no row exists. */}
      <RichBodySection html={page?.body} />

      <TrustRibbon />

      {serviceItems.length > 0 ? (
        <div id="prescriptions" className="scroll-mt-24">
          <ServicesGrid
            eyebrow="Practice areas"
            title="Doctors handling repeat prescription requests"
            intro={`${serviceItems.length} ${serviceItems.length === 1 ? "doctor" : "doctors"} in our ${config.name} network reviewing repeat prescription requests. Profiles update as the team grows.`}
            items={serviceItems}
            variant="dark"
          />
        </div>
      ) : (
        <section
          style={{
            background: "var(--color-background-dark)",
            padding: "clamp(48px,6vw,80px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-3xl px-5 md:px-10 text-center">
            <p style={{ color: "rgba(255,255,255,0.55)" }}>
              Repeat prescription review for {config.name} is rolling out soon.
              In the meantime, browse our general practitioners — repeat
              prescription review is part of the regular care they offer.
            </p>
          </div>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={fallbackHref} />
    </>
  );
}
