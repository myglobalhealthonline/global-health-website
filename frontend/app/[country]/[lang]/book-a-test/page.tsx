import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, CreditCard, FlaskConical, MapPin } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { isSupportedLocale } from "@/lib/content/get-page-content";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd, catalogueItemListJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
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
 * Same anatomy as the other service hubs: dark PageHero, then the catalogue on
 * a forest section in the shared dark-glass ServiceCard — never bare white
 * cards, which no other public page uses.
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
  const countryName = getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  const tests = await getCountryBookableTests(code, lang);
  const base = `/${slug}/${lang}`;

  const trustCards = [
    {
      icon: <MapPin className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.hero.trustCentresTitle,
      subtitle: t.hero.trustCentresSubtitle,
    },
    {
      icon: <CalendarDays className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.hero.trustTimeTitle,
      subtitle: t.hero.trustTimeSubtitle,
    },
    {
      icon: <CreditCard className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.hero.trustCheckoutTitle,
      subtitle: t.hero.trustCheckoutSubtitle,
    },
  ];

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

      {/* DARK — hero */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${countryName}`}
        watermark={t.hero.eyebrow}
        titleLead={t.hero.title}
        titleAccent=""
        lede={t.hero.subtitle}
        ctaLabel={t.hero.cta}
        ctaHref="#tests"
        trustCards={trustCards}
        heroImage={{ src: "/images/stock/tests.jpg", alt: t.hero.title, priority: true }}
      />

      {/* DARK — catalogue, forest glass cards */}
      <section
        id="tests"
        className="scroll-mt-24 relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
        style={{ padding: "clamp(64px,8vw,120px) 0" }}
      >
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
            {t.hero.eyebrow}
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(2rem,4vw+0.5rem,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white/92">
            {t.catalogue.heading}
          </h2>

          {tests.length === 0 ? (
            <div className="gh2-status-card gh2-status-card-dark mt-12 max-w-2xl text-center">
              <FlaskConical className="mx-auto size-6 text-[var(--color-brand-accent)]" strokeWidth={1.75} aria-hidden />
              <p className="mt-3 text-white/75">{t.catalogue.empty}</p>
            </div>
          ) : (
            <div className="mt-12 gh-card-grid">
              {tests.map((test) => (
                <ServiceCard
                  key={test.id}
                  dark
                  href={`${base}/book-a-test/${test.slug}`}
                  title={test.name}
                  description={
                    test.summary ??
                    (test.centreCount === 1
                      ? t.catalogue.centreCount_one.replace("{count}", "1")
                      : t.catalogue.centreCount_other.replace("{count}", String(test.centreCount)))
                  }
                  startingPrice={t.catalogue.fromPrice.replace(
                    "{price}",
                    formatPriceRounded(test.fromPriceCents, test.currencyCode),
                  )}
                  ctaLabel={t.catalogue.viewTest}
                  imageSrc={test.imagePath ? resolveTrustedAssetUrl(test.imagePath) ?? null : null}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
