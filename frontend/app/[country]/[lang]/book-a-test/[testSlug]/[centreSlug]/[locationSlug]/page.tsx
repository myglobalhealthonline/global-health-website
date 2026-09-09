import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
 * produce a bookable slot.
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

  return (
    <section
      className="gh2-section-ivory"
      style={{ padding: "clamp(40px,5vw,72px) 0" }}
    >
      <div className="mx-auto grid max-w-[var(--container-width)] gap-6 px-5 md:px-10">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-brand-primary)" }}
          >
            {t.hero.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {test.name}
          </h1>
          <p className="mt-2 text-[var(--color-text-muted)]">
            {centre.name} — {location.name} ·{" "}
            <span className="font-extrabold text-[var(--color-text-primary)]">
              {formatPriceRounded(centre.patientPriceCents, centre.currencyCode)}
            </span>
          </p>
        </div>

        <BookTestForm
          countryCode={code}
          countrySlug={slug}
          lang={lang}
          testSlug={testSlug}
          centreSlug={centreSlug}
          locationSlug={locationSlug}
          centreName={`${centre.name} — ${location.name}`}
          centreAddress={
            [location.addressLine, location.city].filter(Boolean).join(", ") || null
          }
          centreTz={centreTz}
          t={t}
          c={bundle.common.bookingForm}
        />
      </div>
    </section>
  );
}
