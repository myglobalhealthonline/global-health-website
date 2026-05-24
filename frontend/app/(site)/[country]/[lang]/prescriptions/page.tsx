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
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { CartServiceCard } from "@/components/cards/CartServiceCard";

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

function formatPrice(cents: number | null, currency: string | null) {
  if (cents == null) return null;
  return formatPriceRounded(cents, currency);
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

  const [items, page] = await Promise.all([
    getCountryServices(code, "PRESCRIPTION"),
    getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale),
  ]);
  // Cart-first booking: hero CTA jumps to the prescription cards
  // below; final CTA falls back to the doctors index for visitors who
  // want a consultation instead.
  const bookHref = "#prescriptions";
  const fallbackHref = `/${slug}/${lang}/doctors`;
  const heroTitle = page?.heroTitle ?? "Online prescriptions";
  const heroSubtitle =
    page?.heroSubtitle ??
    `Renew or get a new prescription from a licensed doctor in ${config.name}, delivered electronically.`;
  const ctaLabel = page?.ctaLabel ?? "Request a prescription";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Online prescriptions", url: `/${slug}/${lang}/prescriptions` },
        ])}
      />

      <PageHero
        countryCode={config.code}
        countryLabel={`${config.name} · Online prescriptions`}
        titleLead="Repeat scripts"
        titleAccent="without"
        titleTrail="the waiting room."
        lede={heroSubtitle}
        ctaLabel={ctaLabel}
        ctaHref={bookHref}
        secondaryLabel="Browse all services"
        secondaryHref={`/${slug}/${lang}`}
      />

      {/* Admin-edited rich body from ContentPage (PRESCRIPTIONS). Hidden
          when no row exists. */}
      <RichBodySection html={page?.body} />

      <TrustRibbon />

      {items.length > 0 ? (
        <section
          id="prescriptions"
          className="scroll-mt-24"
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
              What you can book
            </p>
            <h2
              className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              Prescription services available
            </h2>
            <p
              className="mt-3 max-w-2xl text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              {items.length}{" "}
              {items.length === 1 ? "prescription service" : "prescription services"} in{" "}
              {config.name}. Cards update as the team adds or retires services.
            </p>
            <div className="mt-12 gh-card-grid">
              {items.map((s) => {
                const priceLabel = formatPrice(s.basePriceCents, s.currencyCode);
                return (
                  <CartServiceCard
                    key={s.id}
                    kind="PRESCRIPTION_SERVICE"
                    serviceId={s.id}
                    title={s.name}
                    description={s.summary}
                    imageSrc={s.imageSrc}
                    duration={s.durationMinutes != null ? `${s.durationMinutes} min` : null}
                    startingPrice={priceLabel}
                    ctaLabel={priceLabel ? `Add to cart · ${priceLabel}` : "Add to cart"}
                    iconVariant="stethoscope"
                  />
                );
              })}
            </div>
          </div>
        </section>
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
              Online prescriptions for {config.name} are coming soon. In the meantime,
              book a general consultation and our doctors will issue a prescription
              as part of the visit.
            </p>
          </div>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={fallbackHref} />
    </>
  );
}
