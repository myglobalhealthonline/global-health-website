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
import { SectionSeam } from "@/components/ui/SectionSeam";
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
 * Styled as a forest section on the dark public theme, matching the health-test
 * and consultation hubs — the earlier version used bare utility classes, which
 * rendered dark text on the dark ground and unstyled cards.
 *
 * Lists only exams an admin marked bookable AND that an active centre in this
 * country performs; the backend applies that gate, so nothing here re-filters.
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

      <section
        id="book-a-test"
        className="scroll-mt-24 relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
        style={{ padding: "clamp(64px,8vw,120px) 0" }}
      >
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {t.hero.eyebrow}
          </p>
          <h1
            className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {t.hero.title}
          </h1>
          <p
            className="mt-4 max-w-[60ch]"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            {t.hero.subtitle}
          </p>

          {tests.length === 0 ? (
            <p className="mt-10" style={{ color: "rgba(255,255,255,0.65)" }}>
              {t.catalogue.empty}
            </p>
          ) : (
            <ul className="mt-10 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <li
                  key={test.id}
                  className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-white p-6 shadow-sm"
                >
                  <h2 className="m-0 text-lg font-extrabold text-[var(--color-text-primary)]">
                    {test.name}
                  </h2>
                  {test.summary ? (
                    <p className="m-0 text-sm text-[var(--color-text-muted)]">
                      {test.summary}
                    </p>
                  ) : null}
                  <p className="m-0 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {test.centreCount === 1
                      ? t.catalogue.centreCount_one.replace("{count}", "1")
                      : t.catalogue.centreCount_other.replace(
                          "{count}",
                          String(test.centreCount),
                        )}
                  </p>
                  <p className="m-0 text-xl font-extrabold text-[var(--color-text-primary)]">
                    {t.catalogue.fromPrice.replace(
                      "{price}",
                      formatPriceRounded(test.fromPriceCents, test.currencyCode),
                    )}
                  </p>
                  <Link
                    href={`${base}/book-a-test/${test.slug}`}
                    className="gh-btn gh-btn-primary mt-auto w-full justify-center"
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
