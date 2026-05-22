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
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

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
  const page = await getPublicPage(code, "HEALTH_TESTS", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/tests`;
  const title = page?.seoTitle ?? `Home health tests in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ?? `Lab-quality home health tests delivered in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/tests") },
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

  const [items, page] = await Promise.all([
    getCountryHealthTests(code),
    getPublicPage(code, "HEALTH_TESTS", lang as PublicLocale),
  ]);
  // Cart-first booking: hero/final CTA points at the tests grid below.
  const bookHref = "#tests";
  const heroTitle = page?.heroTitle ?? "Lab-quality tests, delivered home";
  const heroSubtitle =
    page?.heroSubtitle ??
    `Order a kit, take the sample at home, send it back. Results reviewed by a doctor licensed in ${config.name}.`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Health tests", url: `/${slug}/${lang}/tests` },
        ])}
      />

      <PageHero
        countryCode={config.code}
        countryLabel={`${config.name} · Home health tests`}
        titleLead="Lab-quality"
        titleAccent="results"
        titleTrail="without leaving home."
        lede={heroSubtitle}
        ctaLabel="Browse tests"
        ctaHref={bookHref}
        secondaryLabel="Book a consultation"
        secondaryHref={`/${slug}/${lang}/general-consultation`}
      />

      {/* Admin-edited rich body from ContentPage (HEALTH_TESTS). */}
      <RichBodySection html={page?.body} />

      <TrustRibbon />

      {items.length > 0 ? (
        <section
          id="tests"
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
              What you can order
            </p>
            <h2
              className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {items.length} {items.length === 1 ? "test" : "tests"} available
            </h2>
            <div className="mt-12 gh-card-grid">
              {items.map((t) => {
                const soldOut = t.stock !== null && t.stock <= 0;
                const lowStock = !soldOut && t.stock !== null && t.stock <= 5;
                const ctaLabel = soldOut
                  ? "Sold out"
                  : lowStock
                    ? `Add to cart · Only ${t.stock} left`
                    : `Add to cart · ${formatPrice(t.priceCents, t.currencyCode)}`;
                return (
                  <article
                    key={t.id}
                    className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    {t.imageSrc ? (
                      <div
                        className="aspect-[16/10] w-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.imageSrc}
                          alt={t.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="flex h-full flex-col p-6 sm:p-7">
                      <h3
                        className="text-lg font-bold tracking-[-0.01em]"
                        style={{ color: "rgba(255,255,255,0.88)" }}
                      >
                        {t.title}
                      </h3>
                      {t.shortDescription ? (
                        <p
                          className="mt-2 flex-1 line-clamp-3 text-sm leading-relaxed"
                          style={{ color: "rgba(255,255,255,0.42)" }}
                        >
                          {t.shortDescription}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {t.sampleType ? (
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              color: "rgba(255,255,255,0.45)",
                            }}
                          >
                            Sample: {t.sampleType}
                          </span>
                        ) : null}
                        {t.resultsTimeline ? (
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              color: "rgba(255,255,255,0.45)",
                            }}
                          >
                            Results: {t.resultsTimeline}
                          </span>
                        ) : null}
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            background: "rgba(176,241,34,0.12)",
                            color: "var(--color-brand-accent)",
                          }}
                        >
                          {formatPrice(t.priceCents, t.currencyCode)}
                        </span>
                      </div>
                      <div className="mt-auto pt-5">
                        {soldOut ? (
                          <button
                            type="button"
                            disabled
                            aria-label={`${t.title} — sold out`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold cursor-not-allowed"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.25)",
                            }}
                          >
                            Sold out
                          </button>
                        ) : (
                          <AddToCartButton
                            kind="HEALTH_TEST"
                            healthTestId={t.id}
                            label={ctaLabel}
                          />
                        )}
                      </div>
                    </div>
                  </article>
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
              Home health tests for {config.name} are coming soon.
            </p>
          </div>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
