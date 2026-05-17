import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { countries, getCountryByCode } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryHealthTests } from "@/lib/content/get-country-collections";
import { SITE_NAME } from "@/lib/constants";

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
  const url = `${getSiteUrl()}/${country}/${lang}/tests`;
  return {
    title: `Home health tests in ${config.name} · ${SITE_NAME}`,
    description: `Lab-quality home health tests delivered in ${config.name}.`,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/tests") },
    openGraph: { type: "website", siteName: SITE_NAME, url },
  };
}

function formatPrice(cents: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : currency;
  return `${symbol}${(cents / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
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

  const items = await getCountryHealthTests(code);
  const bookHref = `/${slug}/${lang}/book-online?type=health-test`;

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
        <h1 className="mt-3 text-4xl font-semibold text-slate-900 sm:text-5xl">
          Lab-quality tests, delivered home
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Order a kit, take the sample at home, send it back. Results reviewed by
          a doctor licensed in {config.name}.
        </p>
      </section>

      <TrustRibbon />

      {items.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold text-slate-900">
            {items.length} {items.length === 1 ? "test" : "tests"} available
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <Link
                key={t.id}
                // `?service=<slug>` triggers the price + Stripe handoff.
                // HealthTest rows have their own slug; the backend
                // resolves it the same way as Service slugs.
                href={`${bookHref}${bookHref.includes("?") ? "&" : "?"}service=${encodeURIComponent(t.slug)}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
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
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700">
                    {t.title}
                  </h3>
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
                  </div>
                </div>
              </Link>
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
