import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCountryByCode } from "@/data/countries";
import { getCountryDoctors, getCountryServices } from "@/lib/content/get-country-collections";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { VerifiedProfessionals } from "@/components/sections/VerifiedProfessionals";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd, physicianJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import { resolveBrandTitle } from "@/lib/seo/page-seo";
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
import type { DoctorDirectoryContext } from "@/lib/content/doctor-directory";
import { overrideDoctorsBundle } from "@/lib/content/country-doctors-copy";
import { DoctorsDirectoryClient } from "./_components/DoctorsDirectoryClient";

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
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const { record: page } = await getPageContent(code, "DOCTORS_INDEX", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/doctors`;
  const title =
    page?.seoTitle ?? `${config.name} — registered doctors and specialists`;
  const description =
    page?.seoDescription ??
    `Doctors and specialists registered to practise in ${config.name}. Browse profiles by specialty and language.`;
  return {
    title: resolveBrandTitle(title),
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/doctors") },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      ...ogLocales(config, lang),
      ...(page?.ogImageSrc ? { images: [{ url: page.ogImageSrc }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(page?.ogImageSrc ? { images: [{ url: page.ogImageSrc }] } : {}),
    },
  };
}

/**
 * Server component: fetches + renders the FULL, unfiltered doctor roster
 * for the country. No `searchParams` read here — that's what makes this
 * page eligible for static generation (P-001). The `?lang=`/`?type=`
 * filter chips are applied client-side by `DoctorsDirectoryClient`, which
 * needs `useSearchParams` and is therefore wrapped in `<Suspense>` below.
 *
 * The fallback here is a lightweight, contentless skeleton — NOT another
 * copy of the directory. `DoctorsDirectoryClient` doesn't actually suspend
 * (`useSearchParams` resolves synchronously), so React's streaming SSR
 * flushes the fallback frame and then immediately flushes the resolved
 * child into the same response. A real `<DoctorDirectoryView>` fallback
 * therefore shipped the ENTIRE directory (hero, stat bar, featured card,
 * every doctor card) TWICE in the raw HTML — a duplicate-content SEO bug.
 * The full roster still reaches crawlers exactly once, via the resolved
 * child render; the SEO win from static generation is unaffected.
 */
export default async function CountryLangDoctorsPage({
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

  const { common } = loadLocaleBundle(lang as LocaleCode);

  const [doctors, { record: rawPage, disabled: pageDisabled }, countryTrust, generalServices, specialistServices] = await Promise.all([
    getCountryDoctors(code, lang),
    getPageContent(code, "DOCTORS_INDEX", lang as PublicLocale),
    getCountryTrust(code),
    getCountryServices(code, "GENERAL", lang),
    getCountryServices(code, "SPECIALIST", lang),
  ]);
  const verifyUrl = doctorVerificationUrl(countryTrust) ?? undefined;

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
    i18n: overrideDoctorsBundle(common.doctors, code, lang),
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: config.name, url: `/${slug}/${lang}` },
            { name: "Doctors", url: `/${slug}/${lang}/doctors` },
          ]),
          physicianItemListJsonLd,
        ]}
      />
      {page?.sections.faq ? <JsonLd data={faqJsonLd(page.faq)} /> : null}
      {/* Directory IS this page's header/hero (no ServiceHero here) — every
          marketing section below must render AFTER it, never before. */}
      <Suspense fallback={<DoctorsDirectorySkeleton />}>
        <DoctorsDirectoryClient ctx={directoryCtx} />
      </Suspense>
      {countryTrust ? (
        <VerifiedProfessionals trust={countryTrust} locale={lang} country={code} />
      ) : null}
      <DoctifyReviewsSection
        theme="forest"
        variant="carousel"
        language={lang}
        headline="What patients say about"
        headlineAccent="our doctors"
      />
      {page?.sections.intro ? (
        <ServiceIntro body={page.intro!} theme={themeProp(page?.introTheme, "light")} />
      ) : null}
      {page?.sections.whoFor ? (
        <ChecklistSection
          eyebrow="Who it's for"
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

/** Contentless placeholder for the brief window before `DoctorsDirectoryClient`
 *  resolves — see the duplicate-content note above the page component. */
function DoctorsDirectorySkeleton() {
  return (
    <div aria-hidden className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
      <div className="h-[70vh] min-h-[520px] w-full animate-pulse bg-[var(--color-brand-primary)]/90" />
      <div className="gh-container py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[360px] animate-pulse rounded-2xl bg-black/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
