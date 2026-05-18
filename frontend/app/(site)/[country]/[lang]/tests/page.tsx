import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
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
  const bookHref = `/${slug}/${lang}/book-online?type=health-test`;
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

      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <p className="text-sm uppercase tracking-wide text-emerald-700">
          {config.name} · Home health tests
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900 sm:text-5xl">{heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{heroSubtitle}</p>
      </section>

      {/* Admin-edited rich body from ContentPage (HEALTH_TESTS). */}
      <RichBodySection html={page?.body} />

      <TrustRibbon />

      {items.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold text-slate-900">
            {items.length} {items.length === 1 ? "test" : "tests"} available
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <article
                key={t.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {t.imageSrc ? (
                  <div className="aspect-[16/10] w-full overflow-hidden bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.imageSrc}
                      alt={t.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex h-full flex-col p-6">
                  <h3 className="text-lg font-bold text-slate-900">{t.title}</h3>
                  {t.shortDescription ? (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                      {t.shortDescription}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {t.sampleType ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Sample: {t.sampleType}
                      </span>
                    ) : null}
                    {t.resultsTimeline ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Results: {t.resultsTimeline}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                      {formatPrice(t.priceCents, t.currencyCode)}
                    </span>
                    {/* Stock signal — null = unlimited, hidden.
                        0 = sold out badge. 1–5 = "Only N left" badge. */}
                    {t.stock !== null && t.stock <= 0 ? (
                      <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                        Sold out
                      </span>
                    ) : t.stock !== null && t.stock <= 5 ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                        Only {t.stock} left
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-auto pt-5">
                    {t.stock !== null && t.stock <= 0 ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500"
                      >
                        Sold out
                      </button>
                    ) : (
                      <AddToCartButton
                        kind="HEALTH_TEST"
                        healthTestId={t.id}
                        label={`Add to cart · ${formatPrice(t.priceCents, t.currencyCode)}`}
                      />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-600">
          <p>Home health tests for {config.name} are coming soon.</p>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
