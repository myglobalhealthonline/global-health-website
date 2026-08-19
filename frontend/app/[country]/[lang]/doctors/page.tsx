import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCountryByCode } from "@/data/countries";
import { getCountryDoctors, getCountryServices } from "@/lib/content/get-country-collections";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { VerifiedProfessionals } from "@/components/sections/VerifiedProfessionals";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { breadcrumbJsonLd, physicianJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import { buildPublicMetadata, noindexFollow } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import {
  getPageContent,
  isSupportedLocale,
  themeProp,
  type PublicLocale,
} from "@/lib/content/get-page-content";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import {
  ServiceIntro,
  ChecklistSection,
  WhyChooseSection,
} from "@/components/sections/ServiceContentSections";
import { SITE_NAME } from "@/lib/constants";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";
import {
  buildDoctorDirectoryView,
  type DoctorDirectoryContext,
} from "@/lib/content/doctor-directory";
import { DoctorDirectoryView } from "./_components/DoctorDirectoryView";
import { DoctorTeamHero } from "@/components/sections/DoctorTeamHero";
import { overrideDoctorsBundle } from "@/lib/content/country-doctors-copy";
import { fetchGlobalConsultationCount } from "@/lib/api/consultation-count";

type Params = { country: string; lang: string };
type Query = Record<string, string | string[] | undefined>;

/** Normalise one `searchParams` entry to the string[] `parseMultiParam` wants. */
function multi(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

/** A filtered directory state is a facet of the clean page, not its own entry. */
function hasFilterState(query: Query): boolean {
  return multi(query.lang).length > 0 || multi(query.type).length > 0;
}

export async function generateStaticParams(): Promise<Params[]> {
  return countryLangParams();
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const query = await searchParams;
  const code = countryCodeFromSlug(country);
  const config = code ? await getPublicCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const { record: page } = await getPageContent(code, "DOCTORS_INDEX", lang as PublicLocale);
  const title =
    page?.seoTitle ?? `${config.name} — registered doctors and specialists`;
  const description =
    page?.seoDescription ??
    `Doctors and specialists registered to practise in ${config.name}. Browse profiles by specialty and language.`;
  const localized = overrideDoctorsBundle(
    loadLocaleBundle(lang as LocaleCode).common.doctors,
    code,
    lang,
  );
  const metadataTitle = (page?.seoTitle ??
    `${localized.heroTitleLead} ${localized.heroTitleAccent} ${localized.heroTitleTrail} — ${config.name}`) || title;
  const metadataDescription = (page?.seoDescription ?? localized.heroLedeTemplate.replace("{country}", config.name)) || description;
  const metadata = buildPublicMetadata({
    path: `/${country}/${lang}/doctors`,
    title: metadataTitle,
    description: metadataDescription,
    locale: ogLocales(config, lang).locale,
    kind: "doctor",
    subtitle: config.name,
    sourceImage: page?.ogImageSrc ?? undefined,
    imageAlt: `${metadataTitle} — ${config.name}`,
    languages: hreflangAlternates(config, "/doctors"),
  });
  // `?lang=`/`?type=` are filter facets of this same roster, not their own
  // search entries — same convention as the booking-workflow states (SEO-004):
  // clean canonical, noindex, follow, and no hreflang claim of their own.
  return hasFilterState(query) ? noindexFollow(metadata) : metadata;
}

/**
 * Server component: fetches + renders the doctor roster for the country, with
 * the `?lang=`/`?type=` chips applied SERVER-side.
 *
 * History worth keeping: the filters used to run in a client child behind
 * `<Suspense>` so the page could be statically generated (P-001). That never
 * materialised — `next build` emits zero prerendered HTML for any
 * `[country]/[lang]` route; they are all `f` (server-rendered on demand).
 * What the boundary did produce on every request was the fallback AND the
 * resolved child in one response: the ENTIRE directory twice (~137 KB of
 * duplicate markup), while a filtered URL still served the unfiltered roster
 * to crawlers and no-JS visitors. Reading `searchParams` here renders it once,
 * correctly filtered. Do NOT reintroduce the boundary unless these routes
 * actually become static again.
 */
export default async function CountryLangDoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}) {
  const { country: slug, lang } = await params;
  const query = await searchParams;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const { common } = loadLocaleBundle(lang as LocaleCode);

  const [doctors, { record: rawPage, disabled: pageDisabled }, countryTrust, generalServices, specialistServices, consultationCountResult] = await Promise.all([
    getCountryDoctors(code, lang),
    getPageContent(code, "DOCTORS_INDEX", lang as PublicLocale),
    getCountryTrust(code, lang as LocaleCode),
    getCountryServices(code, "GENERAL", lang),
    getCountryServices(code, "SPECIALIST", lang),
    fetchGlobalConsultationCount(),
  ]);
  const verifyUrl = doctorVerificationUrl(countryTrust) ?? undefined;

  // TRUST-METRIC-001: historical base + live completed-appointment count.
  // Falls back to the historical base alone (still a true figure) if the
  // backend read fails. Only the markets/locales with a `{count}` template
  // in their trustCard2Subtitle override (see country-doctors-copy.ts) are
  // affected — every other locale's copy has no placeholder, so `.replace`
  // is a no-op there.
  const consultationCount = consultationCountResult.ok
    ? consultationCountResult.data.total
    : 45_000;
  const doctorsBundle = overrideDoctorsBundle(common.doctors, code, lang);
  const doctorsI18n = doctorsBundle.trustCard2Subtitle?.includes("{count}")
    ? {
        ...doctorsBundle,
        trustCard2Subtitle: doctorsBundle.trustCard2Subtitle.replace(
          "{count}",
          consultationCount.toLocaleString(lang),
        ),
      }
    : doctorsBundle;

  // Structured PageContent self-gates via publish status; legacy "pages"
  // country-feature no longer gates it.
  const page = pageDisabled ? null : rawPage;

  // Physician ItemList schema — one Physician node per registered doctor in
  // this country (the FULL roster, independent of any client-side filter).
  // This is the E-E-A-T signal Google and AI models read to identify and
  // cite named licensed practitioners. Regulator (recognizedBy) comes from
  // country trust.
  const schemaRegulator = countryTrust?.regulator?.name
    ? { name: countryTrust.regulator.name, url: countryTrust.regulator.url }
    : null;
  const physicianItemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: doctors.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: physicianJsonLd({
        name: d.fullName,
        title: d.title,
        countryName: config.name,
        url: `/${slug}/${lang}/doctors/${d.slug}`,
        imageSrc: d.imageSrc ?? undefined,
        languages: d.languages,
        registrationNumber: d.registrationNumber ?? null,
        chamber: d.registrationChamber ?? null,
        division: d.registrationDivision ?? null,
        regulator: schemaRegulator,
        credentials: d.credentials,
        imageAltText: d.imageAltText,
        imageCaption: d.imageCaption ?? d.imageDescription,
        bio: d.bio,
        nonPhysician: d.nonPhysician === true,
      }),
    })),
  };

  const directoryCtx: DoctorDirectoryContext = {
    countryName: config.name,
    countrySlug: slug,
    lang,
    doctors,
    generalServiceIds: generalServices.map((s) => s.id),
    specialistServiceIds: specialistServices.map((s) => s.id),
    verifyUrl,
    i18n: doctorsI18n,
  };

  // Unfiltered view — feeds the hero counts, which sit above the filter bar
  // and so always describe the full roster.
  const baseDirectoryView = buildDoctorDirectoryView(directoryCtx, [], []);
  const filteredDirectoryView = hasFilterState(query)
    ? buildDoctorDirectoryView(directoryCtx, multi(query.lang), multi(query.type))
    : baseDirectoryView;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: common.navigation.home, url: "/" },
            { name: common.countryNames?.[code] ?? config.name, url: `/${slug}/${lang}` },
            { name: common.navigation.doctors, url: `/${slug}/${lang}/doctors` },
          ]),
          physicianItemListJsonLd,
        ]}
      />
      {page?.sections.faq ? <JsonLd data={faqJsonLd(page.faq)} /> : null}
      {/* Directory IS this page's header/hero (no ServiceHero here) — every
          marketing section below must render AFTER it, never before. */}
      {/* The hero — and with it the page’s single <h1> — renders OUTSIDE the
          Suspense boundary. A dynamically rendered page streams both the
          fallback and the resolved child into the HTML, so a heading inside
          the boundary shipped twice: h1=2 on all 33 country/locale directory
          pages. Keep it here, above the boundary. */}
      <DoctorTeamHero
        countryName={baseDirectoryView.countryName}
        bookingHref={baseDirectoryView.bookingHref}
        bookingLabel={baseDirectoryView.bookingLabel}
        availableCount={baseDirectoryView.totalDoctorCount}
        i18n={baseDirectoryView.i18n}
      />
      <DoctorDirectoryView view={filteredDirectoryView} />
      {countryTrust ? (
        <VerifiedProfessionals trust={countryTrust} locale={lang} country={code} />
      ) : null}
      <DoctifyReviewsSection
        theme="forest"
        variant="carousel"
        language={lang}
        eyebrow={common.a11y.patientReviews}
        headline={common.doctify.patientsSayHeadline ?? "What patients say about"}
        headlineAccent={common.doctify.patientsSayAccent ?? "our doctors"}
        body={common.doctify.body}
      />
      {page?.sections.intro ? (
        <ServiceIntro eyebrow={common.sections.overview} body={page.intro!} theme={themeProp(page?.introTheme, "light")} />
      ) : null}
      {page?.sections.whoFor ? (
        <ChecklistSection
          eyebrow={common.sections.whoItsFor}
          title={page.whoForTitle!}
          intro={page.whoForIntro ?? undefined}
          items={page.whoForItems}
          theme={themeProp(page?.whoForTheme, "light")}
        />
      ) : null}
      {page?.sections.whyChoose ? (
        <WhyChooseSection
          title={page.whyChooseTitle!}
          items={page.whyChooseItems}
          theme={themeProp(page?.whyChooseTheme, "soft")}
        />
      ) : null}
      {page?.sections.faq ? (
        <FAQSection items={page.faq} theme={themeProp(page?.faqTheme, "dark")} />
      ) : null}
      {page?.sections.disclaimer ? (
        <MedicalDisclaimer
          paragraphs={page.disclaimerParagraphs}
          theme={themeProp(page?.disclaimerTheme, "dark")}
          title={common.a11y.medicalDisclaimer}
        />
      ) : null}
    </>
  );
}
