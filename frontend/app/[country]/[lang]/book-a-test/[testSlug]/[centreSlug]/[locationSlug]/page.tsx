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
 * Pick a time and book: one exam, one centre branch.
 *
 * The centre and branch are validated here against the exam's published list,
 * so a hand-typed slug 404s rather than rendering a picker that could never
 * produce a bookable slot. The wizard chrome (flow header, step rail, time and
 * details steps) lives in BookTestForm, mirroring /book.
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
  const location = centre.locations.find((l) => l.slug === locationSlug);
  if (!location) notFound();

  const bundle = loadLocaleBundle(lang as LocaleCode);
  const bp = bundle.common.bookPage;
  // Slots are authored and rendered in the centre's own market timezone — the
  // same value the admin grid uses, so "09:00" means the same thing to the
  // patient, the centre and the admin.
  // Falls back to UTC only when a market has no BookingSetting — the same
  // fallback the backend slot engine uses, so the two never disagree.
  const centreTz = overlay?.bookingTimezone ?? "UTC";

  return (
    <BookTestForm
      countryCode={code}
      countrySlug={slug}
      lang={lang}
      testSlug={testSlug}
      centreSlug={centreSlug}
      locationSlug={locationSlug}
      testName={test.name}
      centreName={`${centre.name} — ${location.name}`}
      centreAddress={[location.addressLine, location.city].filter(Boolean).join(", ") || null}
      priceLabel={formatPriceRounded(centre.patientPriceCents, centre.currencyCode)}
      centreTz={centreTz}
      t={bundle.bookATest}
      c={bundle.common.bookingForm}
      bp={{ stepTime: bp.stepTime, stepDetails: bp.stepDetails, bookingSteps: bp.bookingSteps }}
    />
  );
}
