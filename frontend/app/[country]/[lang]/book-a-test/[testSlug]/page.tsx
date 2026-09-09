import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-page-content";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { getBookableTestBySlug } from "@/lib/content/get-country-tests";

type Params = { country: string; lang: string; testSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, testSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const test = await getBookableTestBySlug(code, testSlug, lang);
  if (!test) return { title: SITE_NAME };
  return buildPublicMetadata({
    path: `/${country}/${lang}/book-a-test/${testSlug}`,
    title: test.seoTitle ?? test.name,
    description:
      test.seoDescription ??
      test.summary ??
      `Book ${test.name} at a test centre near you.`,
  });
}

/**
 * One test, and every centre in this market that performs it.
 *
 * The centre list is the choice that matters here: price and available times
 * both come from the centre, not the test, so the patient picks a centre before
 * they pick a time.
 */
export default async function BookATestDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang, testSlug } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "book-a-test")) notFound();

  const t = loadLocaleBundle(lang as LocaleCode).bookATest;
  const test = await getBookableTestBySlug(code, testSlug, lang);
  // Unpublished and nonexistent are the same 404 — an unpublished exam must not
  // be distinguishable from one that never existed.
  if (!test) notFound();

  const base = `/${slug}/${lang}`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: config.name, url: base },
          { name: t.meta.title, url: `${base}/book-a-test` },
          { name: test.name, url: `${base}/book-a-test/${test.slug}` },
        ])}
      />

      <section className="gh-section">
        <div className="gh-container">
          <p className="gh-eyebrow">{t.hero.eyebrow}</p>
          <h1 className="gh-h1">{test.heroTitle ?? test.name}</h1>
          {test.heroDescription ?? test.summary ? (
            <p className="gh-lede max-w-[65ch]">
              {test.heroDescription ?? test.summary}
            </p>
          ) : null}
          <p className="font-semibold">
            {t.catalogue.fromPrice.replace(
              "{price}",
              formatPriceRounded(test.fromPriceCents, test.currencyCode),
            )}
          </p>
        </div>
      </section>

      {test.detailBody ? (
        <section className="gh-section">
          <div className="gh-container">
            <h2 className="gh-h2">{t.detail.aboutThisTest}</h2>
            {/* Sanitized server-side on write (sanitizeRichHtml), never here. */}
            <div
              className="gh-prose"
              dangerouslySetInnerHTML={{ __html: test.detailBody }}
            />
          </div>
        </section>
      ) : null}

      {test.preparationBody ? (
        <section className="gh-section">
          <div className="gh-container">
            <h2 className="gh-h2">{t.detail.preparation}</h2>
            <div
              className="gh-prose"
              dangerouslySetInnerHTML={{ __html: test.preparationBody }}
            />
          </div>
        </section>
      ) : null}

      <section className="gh-section">
        <div className="gh-container">
          <h2 className="gh-h2">{t.detail.chooseCentre}</h2>
          <p className="gh-lede">{t.detail.chooseCentreHint}</p>
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
            {test.centres.map((centre) => (
              <li key={centre.id} className="gh-card flex flex-col gap-2 p-5">
                <h3 className="gh-h3 m-0">{centre.name}</h3>
                <p className="m-0 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <Clock className="size-3.5" aria-hidden />
                  {centre.turnaroundDays
                    ? t.detail.turnaround.replace(
                        "{days}",
                        String(centre.turnaroundDays),
                      )
                    : t.detail.turnaroundUnknown}
                </p>
                <p className="m-0 font-semibold">
                  {formatPriceRounded(centre.patientPriceCents, centre.currencyCode)}
                </p>

                {/* The branch is the real choice: same price everywhere, so the
                    patient is picking where to travel to, not what to pay. */}
                <p className="m-0 mt-1 text-portal-meta font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  {t.detail.chooseLocation}
                </p>
                <ul className="m-0 grid list-none gap-2 p-0">
                  {centre.locations.map((loc) => (
                    <li key={loc.id}>
                      <Link
                        href={`${base}/book-a-test/${test.slug}/${centre.slug}/${loc.slug}`}
                        className="flex w-full items-start gap-1.5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-3 py-2 text-left text-sm hover:border-[var(--color-brand-primary)]"
                      >
                        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span>
                          <span className="block font-semibold text-[var(--color-text-primary)]">
                            {loc.name}
                          </span>
                          {loc.addressLine || loc.city ? (
                            <span className="block text-[var(--color-text-muted)]">
                              {[loc.addressLine, loc.city].filter(Boolean).join(", ")}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
