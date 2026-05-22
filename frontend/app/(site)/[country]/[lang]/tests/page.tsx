import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

      <section className="gh-section-tight mx-auto max-w-5xl px-4 text-center">
        <p className="gh-eyebrow text-[var(--color-brand-primary)]">
          {config.name} · Home health tests
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-[var(--color-text-primary)] sm:text-5xl">
          {heroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-text-muted)]">
          {heroSubtitle}
        </p>
      </section>

      {/* Admin-edited rich body from ContentPage (HEALTH_TESTS). */}
      <RichBodySection html={page?.body} />

      <TrustRibbon />

      {items.length > 0 ? (
        <section id="tests" className="gh-section-tight mx-auto max-w-6xl scroll-mt-24 px-4">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {items.length} {items.length === 1 ? "test" : "tests"} available
          </h2>
          <div className="mt-8 gh-card-grid">
            {items.map((t) => {
              // Audit fix: collapse the three cascading stock badges into a
              // single CTA state. "Sold out" → disabled button. "Only N left"
              // → primary CTA prefixed with the low-stock count. Otherwise
              // just the standard add-to-cart label. Strips two coloured
              // chips per card (the rose "Sold out" + amber "Only N left").
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
                  className="
                    flex h-full flex-col overflow-hidden
                    rounded-[var(--radius-card)]
                    border border-[var(--color-border)]
                    bg-[var(--color-background-page)]
                    shadow-[var(--shadow-soft)]
                  "
                >
                  {t.imageSrc ? (
                    <div className="aspect-[16/10] w-full overflow-hidden bg-[var(--color-background-soft)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.imageSrc}
                        alt={t.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex h-full flex-col p-6">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {t.title}
                    </h3>
                    {t.shortDescription ? (
                      <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-muted)]">
                        {t.shortDescription}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      {t.sampleType ? (
                        <span className="rounded-full bg-[var(--color-background-panel)] px-3 py-1">
                          Sample: {t.sampleType}
                        </span>
                      ) : null}
                      {t.resultsTimeline ? (
                        <span className="rounded-full bg-[var(--color-background-panel)] px-3 py-1">
                          Results: {t.resultsTimeline}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-[var(--color-accent-dim)] px-3 py-1 font-semibold text-[var(--color-brand-primary)]">
                        {formatPrice(t.priceCents, t.currencyCode)}
                      </span>
                    </div>
                    <div className="mt-auto pt-5">
                      {soldOut ? (
                        <button
                          type="button"
                          disabled
                          aria-label={`${t.title} — sold out`}
                          className="
                            inline-flex w-full items-center justify-center gap-2
                            rounded-full px-5 py-2.5 text-sm font-semibold
                            bg-[var(--color-background-panel)]
                            text-[var(--color-text-placeholder)]
                            cursor-not-allowed
                          "
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
        </section>
      ) : (
        <section className="gh-section-tight mx-auto max-w-3xl px-4 text-center text-[var(--color-text-muted)]">
          <p>Home health tests for {config.name} are coming soon.</p>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
