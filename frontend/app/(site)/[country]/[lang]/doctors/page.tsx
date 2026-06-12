import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { FeaturedDoctor } from "@/components/sections/FeaturedDoctor";
import { JsonLd } from "@/components/seo/JsonLd";
import { countries, getCountryByCode } from "@/data/countries";
import { getCountryDoctors } from "@/lib/content/get-country-collections";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { VerifiedProfessionals } from "@/components/sections/VerifiedProfessionals";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { buildBookHref } from "@/lib/routing/book-href";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
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
type SearchParams = { lang?: string | string[]; specialty?: string | string[] };

/** Stable slug for a specialty name so it survives in the URL filter
 *  param (e.g. "Cardiology" → "cardiology", "Women's Health" →
 *  "womens-health"). */
function specialtySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  const title = page?.seoTitle ?? `${config.name} doctors · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Meet the doctors licensed in ${config.name} and available for online consultations.`;
  return {
    title,
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
  const filterSpecs = parseMultiParam(sp?.specialty).map((s) => specialtySlug(s));

  const { common } = loadLocaleBundle(lang as LocaleCode);

  const [doctors, { record: rawPage, disabled: pageDisabled }, countryTrust] = await Promise.all([
    getCountryDoctors(code, lang),
    getPublicPage(code, "DOCTORS_INDEX", lang as PublicLocale),
    getCountryTrust(code),
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

  const specOptions = Array.from(
    new Map(
      doctors
        .flatMap((d) => d.specialties ?? [])
        .map((name) => [specialtySlug(name), name] as const),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // A doctor passes when it matches EVERY active filter group (AND across
  // groups) and ANY chip within a group (OR within a group).
  const filteredDoctors = doctors.filter((d) => {
    const docLangCodes = (d.languages ?? []).map(languageKey);
    const docSpecSlugs = (d.specialties ?? []).map(specialtySlug);
    const langOk =
      filterLangs.length === 0 ||
      filterLangs.some((code) => docLangCodes.includes(code));
    const specOk =
      filterSpecs.length === 0 ||
      filterSpecs.some((s) => docSpecSlugs.includes(s));
    return langOk && specOk;
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
  }));

  // Build a toggle href: flips one token in its param while preserving
  // the OTHER active filter group. Keeps language + specialty filters
  // independent so toggling a language doesn't wipe a specialty pick.
  function toggleHref(
    param: "lang" | "specialty",
    token: string,
    activeList: string[],
    otherParam: "lang" | "specialty",
    otherList: string[],
  ): string {
    const next = new Set(activeList);
    if (next.has(token)) next.delete(token);
    else next.add(token);
    const qs = new URLSearchParams();
    if (next.size > 0) qs.set(param, Array.from(next).join(","));
    if (otherList.length > 0) qs.set(otherParam, otherList.join(","));
    const str = qs.toString();
    return `/${slug}/${lang}/doctors${str ? `?${str}` : ""}`;
  }

  const hasActive = filterLangs.length > 0 || filterSpecs.length > 0;

  const filterGroups: FilterGroup[] = [
    {
      heading: common.doctors.filterSpeaks,
      options: langOptions.map(([codeKey, label]) => ({
        token: codeKey,
        label,
        active: filterLangs.includes(codeKey),
        href: toggleHref("lang", codeKey, filterLangs, "specialty", filterSpecs),
      })),
    },
    {
      heading: common.doctors.filterSpecialty,
      options: specOptions.map(([specKey, name]) => ({
        token: specKey,
        label: name,
        active: filterSpecs.includes(specKey),
        href: toggleHref("specialty", specKey, filterSpecs, "lang", filterLangs),
      })),
    },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Doctors", url: `/${slug}/${lang}/doctors` },
        ])}
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
                dark={false}
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
          />
        }
      />
      {countryTrust ? <VerifiedProfessionals trust={countryTrust} locale={lang} /> : null}
      <RichBodySection html={page?.body} />
    </>
  );
}
