import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-page-content";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { getBookableTestBySlug } from "@/lib/content/get-country-tests";
import { BookTestForm } from "./_components/book-test-form";

type Params = {
  country: string;
  lang: string;
  testSlug: string;
  centreSlug: string;
  locationSlug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, testSlug, centreSlug, locationSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const test = await getBookableTestBySlug(code, testSlug, lang);
  const centre = test?.centres.find((c) => c.slug === centreSlug);
  const location = centre?.locations.find((l) => l.slug === locationSlug);
  if (!test || !centre || !location) return { title: SITE_NAME };
  return buildPublicMetadata({
    path: `/${country}/${lang}/book-a-test/${testSlug}/${centreSlug}/${locationSlug}`,
    title: `${test.name} — ${centre.name}, ${location.name}`,
    description: test.summary ?? `Book ${test.name} at ${centre.name}.`,
    // A booking step is not a landing page; keep it out of the index.
    noindex: true,
  });
}

/**
 * Pick a time and book: one exam, one centre.
 *
 * The centre is validated here against the exam's published centre list, so a
 * hand-typed centre slug 404s rather than rendering a picker that could never
 * produce a bookable slot. Layout mirrors the consultation booking flow on
 * /book: ivory section, dark forest-glass step panel, summary alongside.
 */
export default async function BookTestAtCentrePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang, testSlug, centreSlug, locationSlug } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "book-a-test")) notFound();

  const test = await getBookableTestBySlug(code, testSlug, lang);
  if (!test) notFound();
  const centre = test.centres.find((c) => c.slug === centreSlug);
  if (!centre) notFound();
  // The branch is validated against the centre's published list, so a
  // hand-typed slug 404s rather than rendering a picker that can never produce
  // a bookable slot.
  const location = centre.locations.find((l) => l.slug === locationSlug);
  if (!location) notFound();

  const bundle = loadLocaleBundle(lang as LocaleCode);
  const t = bundle.bookATest;
  // Slots are authored and rendered in the centre's own market timezone — the
  // same value the admin grid uses, so "09:00" means the same thing to the
  // patient, the centre and the admin.
  // Falls back to UTC only when a market has no BookingSetting — the same
  // fallback the backend slot engine uses, so the two never disagree.
  const centreTz = overlay?.bookingTimezone ?? "UTC";
  const base = `/${slug}/${lang}`;
  const centreName = `${centre.name} — ${location.name}`;

  return (
    <section className="scroll-mt-24 gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel py-[clamp(40px,5vw,72px)]">
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <Link
          href={`${base}/book-a-test/${test.slug}#centres`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)] underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
          {t.booking.changeLocation}
        </Link>

        <header className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
            {t.hero.eyebrow}
          </p>
          <h1 className="mt-2 max-w-[22ch] text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[var(--color-text-primary)]">
            {test.name}
          </h1>
          <p className="mt-3 max-w-[58ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
            {centreName}
          </p>
        </header>

        <BookTestForm
          countryCode={code}
          countrySlug={slug}
          lang={lang}
          testSlug={testSlug}
          centreSlug={centreSlug}
          locationSlug={locationSlug}
          testName={test.name}
          centreName={centreName}
          centreAddress={
            [location.addressLine, location.city].filter(Boolean).join(", ") || null
          }
          priceLabel={formatPriceRounded(centre.patientPriceCents, centre.currencyCode)}
          centreTz={centreTz}
          t={t}
          c={bundle.common.bookingForm}
        />
      </div>
    </section>
  );
}
