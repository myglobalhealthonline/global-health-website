import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { FeaturedDoctor } from "@/components/sections/FeaturedDoctor";
import { JsonLd } from "@/components/seo/JsonLd";
import { countries, getCountryByCode } from "@/data/countries";
import { getCountryDoctors, getCountryServices } from "@/lib/content/get-country-collections";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { VerifiedProfessionals } from "@/components/sections/VerifiedProfessionals";
import { DoctifyReviewsSection } from "@/components/sections/DoctifyReviews";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { buildBookHref } from "@/lib/routing/book-href";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd, physicianJsonLd } from "@/lib/seo/structured-data";
import { resolveBrandTitle } from "@/lib/seo/page-seo";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPublicPage,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-public-page";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { DoctorFilters, type FilterGroup } from "@/components/sections/DoctorFilters";
import { languageKey, languageLabel } from "@/lib/content/languages";
import { SITE_NAME } from "@/lib/constants";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

type Params = { country: string; lang: string };
type SearchParams = {
  lang?: string | string[];
  type?: string | string[];
};

/** Parse a comma-or-repeat search param into a clean string[]. */
function parseMultiParam(raw: string | string[] | undefined): string[] {
  return (Array.isArray(raw) ? raw.flatMap((v) => v.split(",")) : (raw ?? "").split(","))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({
    country: COUNTRY_CODE_TO_SLUG[c.code],
    lang: (c.defaultLocale ?? "EN").toLowerCase(),
  }));
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

  const { record: page } = await getPublicPage(code, "DOCTORS_INDEX", lang as PublicLocale);
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
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryLangDoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();
  const overlay = await getPublicCountryByCode(code);
  const sp = searchParams ? await searchParams : {};
  // Active filters from the URL. Languages keyed by ISO code; specialties
  // by slug. Accept `?lang=es,pt`, `?lang=es&lang=pt`, single value, etc.
  const filterLangs = parseMultiParam(sp?.lang).map((s) => languageKey(s));
  const filterTypes = parseMultiParam(sp?.type)
    .map((s) => s.toLowerCase())
    .filter((s): s is "gp" | "specialist" => s === "gp" || s === "specialist");

  const { common } = loadLocaleBundle(lang as LocaleCode);

  const [doctors, { record: rawPage, disabled: pageDisabled }, countryTrust, generalServices, specialistServices] = await Promise.all([
    getCountryDoctors(code, lang),
    getPublicPage(code, "DOCTORS_INDEX", lang as PublicLocale),
    getCountryTrust(code),
    getCountryServices(code, "GENERAL", lang),
    getCountryServices(code, "SPECIALIST", lang),
  ]);
  const verifyUrl = doctorVerificationUrl(countryTrust) ?? undefined;

  const page = (pageDisabled || !isCountryFeatureEnabled(overlay, "pages")) ? null : rawPage;

  // Distinct language codes + specialty slugs advertised by at least one
  // doctor in this country — these drive the filter chips. Sorted by
  // display label for a stable, readable order.
  const langOptions = Array.from(
    new Map(
      doctors
        .flatMap((d) => d.languages ?? [])
        .map((token) => [languageKey(token), languageLabel(token)] as const),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // GP / Specialist chips — a doctor's type comes from which service kinds
  // they're assigned to (same derivation as the homepage carousel).
  const generalServiceIdSet = new Set(generalServices.map((s) => s.id));
  const specialistServiceIdSet = new Set(specialistServices.map((s) => s.id));
  function doctorTypes(d: (typeof doctors)[number]): Array<"gp" | "specialist"> {
    const types: Array<"gp" | "specialist"> = [];
    if (d.assignedServiceIds.some((id) => generalServiceIdSet.has(id))) types.push("gp");
    if (d.assignedServiceIds.some((id) => specialistServiceIdSet.has(id))) types.push("specialist");
    return types;
  }
  const hasGPDoctors = doctors.some((d) => doctorTypes(d).includes("gp"));
  const hasSpecialistDoctors = doctors.some((d) => doctorTypes(d).includes("specialist"));

  // A doctor passes when it matches EVERY active filter group (AND across
  // groups) and ANY chip within a group (OR within a group).
  const filteredDoctors = doctors.filter((d) => {
    const docLangCodes = (d.languages ?? []).map(languageKey);
    const docTypes = doctorTypes(d);
    const langOk =
      filterLangs.length === 0 ||
      filterLangs.some((code) => docLangCodes.includes(code));
    const typeOk =
      filterTypes.length === 0 || filterTypes.some((t) => docTypes.includes(t));
    return langOk && typeOk;
  });

  // Admin-chosen featured doctor → the spotlight card at the top. Pulled
  // out of the grid below so it isn't shown twice. Only spotlighted when
  // it's part of the current (filtered) view; otherwise the grid just
  // shows the matches.
  const featured = filteredDoctors.find((d) => d.isFeatured) ?? null;
  const gridDoctors = featured
    ? filteredDoctors.filter((d) => d.id !== featured.id)
    : filteredDoctors;

  const doctorCards = gridDoctors.map((d) => ({
    name: d.fullName,
    title: d.title,
    imcRegistration: d.imcRegistration,
    registrationDivision: d.registrationDivision,
    registrationVerified: d.registrationVerified,
    credentials: d.credentials,
    medicalRegistrationUrl: d.medicalRegistrationUrl,
    verificationUrl: verifyUrl,
    languages: d.languages,
    whatsappNumber: d.whatsappNumber,
    instagramUrl: d.instagramUrl,
    facebookUrl: d.facebookUrl,
    linkedinUrl: d.linkedinUrl,
    bio: d.bio ?? `Licensed clinician available for online consultations in ${config.name}.`,
    imageSrc: d.imageSrc,
    href: `/${slug}/${lang}/doctors/${d.slug}`,
    bookingHref: buildBookHref({ country: slug, lang, doctor: d.slug }),
    ctaLabel: common.doctors.viewProfile,
    bookLabel: common.doctors.pickTime,
  }));

  // Build a toggle href: flips one token in its param while preserving
  // every OTHER active filter group, so toggling a language doesn't wipe
  // a specialty or type pick.
  const activeByParam: Record<"lang" | "type", string[]> = {
    lang: filterLangs,
    type: filterTypes,
  };
  function toggleHref(param: "lang" | "type", token: string): string {
    const qs = new URLSearchParams();
    for (const [key, list] of Object.entries(activeByParam) as Array<
      ["lang" | "type", string[]]
    >) {
      const next = new Set(list);
      if (key === param) {
        if (next.has(token)) next.delete(token);
        else next.add(token);
      }
      if (next.size > 0) qs.set(key, Array.from(next).join(","));
    }
    const str = qs.toString();
    return `/${slug}/${lang}/doctors${str ? `?${str}` : ""}`;
  }

  const hasActive = filterLangs.length > 0 || filterTypes.length > 0;

  // Physician ItemList schema — one Physician node per registered doctor in
  // this country, built from the same data the cards render. This is the
  // E-E-A-T signal Google and AI models read to identify and cite named
  // licensed practitioners. Regulator (recognizedBy) comes from country trust.
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

  const filterGroups: FilterGroup[] = [
    {
      // GP / Specialist — each chip only renders when the country actually
      // has a doctor of that type, so a country with GPs only shows just
      // "See a GP" instead of a dead-end "See a Specialist" chip.
      heading: common.doctors.filterType,
      options: [
        ...(hasGPDoctors
          ? [
              {
                token: "gp",
                label: common.doctors.filterTypeGP,
                active: filterTypes.includes("gp"),
                href: toggleHref("type", "gp"),
              },
            ]
          : []),
        ...(hasSpecialistDoctors
          ? [
              {
                token: "specialist",
                label: common.doctors.filterTypeSpecialist,
                active: filterTypes.includes("specialist"),
                href: toggleHref("type", "specialist"),
              },
            ]
          : []),
      ],
    },
    {
      heading: common.doctors.filterSpeaks,
      options: langOptions.map(([codeKey, label]) => ({
        token: codeKey,
        label,
        active: filterLangs.includes(codeKey),
        href: toggleHref("lang", codeKey),
      })),
    },
  ];

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
      <DoctorTeamTemplate
        countryName={config.name}
        doctors={doctorCards}
        bookingHref={buildBookHref({ country: slug, lang })}
        bookingLabel={common.doctors.bookAppointment}
        i18n={common.doctors}
        showBottomCta
        spotlight={
          featured ? (
            <div key="featured-spotlight" className="mb-10">
              <FeaturedDoctor
                standalone={false}
                doctor={{
                  name: featured.fullName,
                  title: featured.title,
                  imcRegistration: featured.imcRegistration,
                  registrationDivision: featured.registrationDivision,
                  registrationVerified: featured.registrationVerified,
                  medicalRegistrationUrl: featured.medicalRegistrationUrl,
                  verificationUrl: verifyUrl,
                  credentials: featured.credentials,
                  languages: featured.languages,
                  bio: featured.bio ?? "",
                  imageSrc: featured.imageSrc ?? null,
                  href: `/${slug}/${lang}/doctors/${featured.slug}`,
                  bookingHref: buildBookHref({ country: slug, lang, doctor: featured.slug }),
                  whatsappNumber: featured.whatsappNumber,
                  instagramUrl: featured.instagramUrl,
                  facebookUrl: featured.facebookUrl,
                  linkedinUrl: featured.linkedinUrl,
                }}
              />
            </div>
          ) : null
        }
        filters={
          <DoctorFilters
            key="doctor-filters"
            groups={filterGroups}
            clearHref={`/${slug}/${lang}/doctors`}
            hasActive={hasActive}
            clearLabel={common.doctors.clearFilters}
            dark
          />
        }
      />
      {countryTrust ? <VerifiedProfessionals trust={countryTrust} locale={lang} /> : null}
      <DoctifyReviewsSection
        theme="forest"
        variant="carousel"
        language={lang}
        headline="What patients say about"
        headlineAccent="our doctors"
      />
      <RichBodySection html={page?.body} />
    </>
  );
}
