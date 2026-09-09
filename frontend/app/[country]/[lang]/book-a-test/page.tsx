import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { isSupportedLocale } from "@/lib/content/get-page-content";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd, catalogueItemListJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { getCountryBookableTests } from "@/lib/content/get-country-tests";

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
  const t = loadLocaleBundle(lang as LocaleCode).bookATest;
  return buildPublicMetadata({
    path: `/${country}/${lang}/book-a-test`,
    title: t.meta.title,
    description: t.meta.description,
  });
}

/**
 * Public "Book a Test" catalogue for one market.
 *
 * Lists only exams an admin has marked bookable AND that at least one active
 * centre in this country performs — the backend applies that gate, so nothing
 * here re-filters. Price is a from-price across the centres offering each exam.
 */
export default async function BookATestPage({
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

  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "book-a-test")) notFound();

  const t = loadLocaleBundle(lang as LocaleCode).bookATest;
  const tests = await getCountryBookableTests(code, lang);
  const base = `/${slug}/${lang}`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: config.name, url: base },
          { name: t.meta.title, url: `${base}/book-a-test` },
        ])}
      />
      {tests.length > 0 ? (
        <JsonLd
          data={catalogueItemListJsonLd(
            tests.map((test) => ({
              name: test.name,
              url: `${base}/book-a-test/${test.slug}`,
            })),
          )}
        />
      ) : null}

      <section className="gh-section">
        <div className="gh-container">
          <p className="gh-eyebrow">{t.hero.eyebrow}</p>
          <h1 className="gh-h1">{t.hero.title}</h1>
          <p className="gh-lede max-w-[60ch]">{t.hero.subtitle}</p>
        </div>
      </section>

      <section className="gh-section">
        <div className="gh-container">
          {tests.length === 0 ? (
            <p className="gh-lede">{t.catalogue.empty}</p>
          ) : (
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <li key={test.id} className="gh-card flex flex-col gap-2 p-5">
                  <h2 className="gh-h3 m-0">{test.name}</h2>
                  {test.summary ? (
                    <p className="m-0 text-sm text-[var(--color-text-muted)]">
                      {test.summary}
                    </p>
                  ) : null}
                  <p className="m-0 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                    <MapPin className="size-3.5" aria-hidden />
                    {test.centreCount === 1
                      ? t.catalogue.centreCount_one.replace("{count}", "1")
                      : t.catalogue.centreCount_other.replace(
                          "{count}",
                          String(test.centreCount),
                        )}
                  </p>
                  <p className="m-0 font-semibold">
                    {t.catalogue.fromPrice.replace(
                      "{price}",
                      formatPriceRounded(test.fromPriceCents, test.currencyCode),
                    )}
                  </p>
                  <Link
                    href={`${base}/book-a-test/${test.slug}`}
                    className="gh-btn gh-btn-primary mt-auto"
                  >
                    {t.catalogue.viewTest}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
