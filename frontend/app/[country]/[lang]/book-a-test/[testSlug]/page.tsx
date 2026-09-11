import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, MapPin, Tag, Timer } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-page-content";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { SectionSeam } from "@/components/ui/SectionSeam";
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

const SECTION_H2 =
  "text-[clamp(1.75rem,3vw+0.5rem,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]";

/**
 * One test, and every centre in this market that performs it.
 *
 * The centre list is the choice that matters here: price and available times
 * both come from the centre, not the test, so the patient picks a centre before
 * they pick a time. Layout follows the site rhythm — dark hero, ivory content,
 * forest centre list in the shared glass material.
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
  const fromPrice = t.catalogue.fromPrice.replace(
    "{price}",
    formatPriceRounded(test.fromPriceCents, test.currencyCode),
  );
  const centreCount =
    test.centreCount === 1
      ? t.catalogue.centreCount_one.replace("{count}", "1")
      : t.catalogue.centreCount_other.replace("{count}", String(test.centreCount));
  const heroImageSrc =
    (test.imagePath ? resolveTrustedAssetUrl(test.imagePath) : undefined) ?? "/images/stock/tests.jpg";

  const trustCards = [
    {
      icon: <Tag className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: fromPrice,
      subtitle: t.detail.chooseCentreHint,
    },
    {
      icon: <MapPin className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: centreCount,
      subtitle: t.detail.chooseLocation,
    },
    ...(test.durationMinutes > 0
      ? [
          {
            icon: <Timer className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.detail.duration.replace("{minutes}", String(test.durationMinutes)),
            subtitle: t.hero.trustTimeSubtitle,
          },
        ]
      : []),
  ];

  const hasAbout = Boolean(test.detailBody);
  const hasPrep = Boolean(test.preparationBody);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: config.name, url: base },
          { name: t.meta.title, url: `${base}/book-a-test` },
          { name: test.name, url: `${base}/book-a-test/${test.slug}` },
        ])}
      />

      {/* DARK — hero */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${t.hero.eyebrow}`}
        watermark={t.hero.eyebrow}
        titleLead={test.heroTitle ?? test.name}
        titleAccent=""
        lede={test.heroDescription ?? test.summary ?? undefined}
        ctaLabel={test.ctaLabel ?? t.catalogue.bookNow}
        ctaHref="#centres"
        secondaryLabel={t.detail.backToTests}
        secondaryHref={`${base}/book-a-test`}
        trustCards={trustCards}
        heroImage={{ src: heroImageSrc, alt: test.name, priority: true }}
      />

      {/* LIGHT — about + preparation, on the section ground (no card fill) */}
      {hasAbout || hasPrep ? (
        <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
          <SectionSeam theme="light" />
          <div
            className={`mx-auto grid max-w-[var(--container-width)] gap-12 px-5 md:px-10 ${
              hasAbout && hasPrep ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16" : ""
            }`}
          >
            {hasAbout ? (
              <div className="min-w-0">
                <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]">
                  {test.name}
                </p>
                <h2 className={`mt-3 ${SECTION_H2} text-[var(--color-text-primary)]`}>
                  {t.detail.aboutThisTest}
                </h2>
                {/* Sanitized server-side on write (sanitizeRichHtml), never here. */}
                <div
                  className="gh-prose mt-6 max-w-[68ch]"
                  dangerouslySetInnerHTML={{ __html: test.detailBody! }}
                />
              </div>
            ) : null}
            {hasPrep ? (
              <div
                className={`min-w-0 ${
                  hasAbout ? "lg:border-l lg:border-[rgba(29,75,54,0.12)] lg:pl-12" : ""
                }`}
              >
                <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]">
                  {t.hero.eyebrow}
                </p>
                <h2 className={`mt-3 ${SECTION_H2} text-[var(--color-text-primary)]`}>
                  {t.detail.preparation}
                </h2>
                <div
                  className="gh-prose mt-6 max-w-[68ch]"
                  dangerouslySetInnerHTML={{ __html: test.preparationBody! }}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* DARK — centres, forest glass cards with selectable branch rows */}
      <section
        id="centres"
        className="scroll-mt-24 relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
        style={{ padding: "clamp(64px,8vw,120px) 0" }}
      >
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
            {centreCount}
          </p>
          <h2 className={`mt-3 max-w-[20ch] ${SECTION_H2} text-white/92`}>{t.detail.chooseCentre}</h2>
          <p className="mt-4 max-w-[60ch] text-white/65">{t.detail.chooseCentreHint}</p>

          <ul className="mt-12 grid list-none gap-5 p-0 md:grid-cols-2">
            {test.centres.map((centre) => (
              <li key={centre.id} className="gh2-glass-forest gh2-dark-content flex flex-col p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-extrabold leading-tight tracking-[-0.02em] text-white/95">
                    {centre.name}
                  </h3>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                    style={{ background: "var(--color-brand-accent)", color: "#0a1f14" }}
                  >
                    <Tag className="size-3.5" aria-hidden />
                    {formatPriceRounded(centre.patientPriceCents, centre.currencyCode)}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/65">
                  <Clock className="size-3.5 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
                  {centre.turnaroundDays
                    ? t.detail.turnaround.replace("{days}", String(centre.turnaroundDays))
                    : t.detail.turnaroundUnknown}
                </p>

                {/* The branch is the real choice: same price everywhere, so the
                    patient is picking where to travel to, not what to pay. */}
                <p className="mt-6 border-t border-white/10 pt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                  {t.detail.chooseLocation}
                </p>
                <ul className="mt-3 grid list-none gap-2 p-0">
                  {centre.locations.map((loc) => {
                    const address = [loc.addressLine, loc.city].filter(Boolean).join(", ");
                    return (
                      <li key={loc.id}>
                        <Link
                          href={`${base}/book-a-test/${test.slug}/${centre.slug}/${loc.slug}`}
                          className="gh2-selectable-dark group flex items-center gap-3 rounded-xl px-4 py-3"
                        >
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[var(--color-brand-accent)]">
                            <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-white/92">{loc.name}</span>
                            {address ? (
                              <span className="block truncate text-sm text-white/55">{address}</span>
                            ) : null}
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-white/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-accent)] motion-reduce:transition-none"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
