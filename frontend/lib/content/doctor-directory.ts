import { buildBookHref } from "@/lib/routing/book-href";
import { languageKey, languageLabel } from "@/lib/content/languages";
import type { FilterGroup } from "@/components/sections/DoctorFilters";
import type { CountryDoctorCard } from "@/lib/content/get-country-collections";
import type { CommonLocale } from "@/lib/i18n/types";

/**
 * Filter predicate + view-model builder for the /doctors directory.
 *
 * Pulled out of the page/component so the exact same logic can build both
 * the static (no-filter) Suspense fallback rendered on the server and the
 * live, `useSearchParams`-driven client view — one implementation, so the
 * two can never drift apart (P-001).
 */

export type DoctorTypeFilter = "gp" | "specialist";

/** Parse a comma-or-repeat search param into a clean string[]. */
export function parseMultiParam(raw: string[]): string[] {
  return raw
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export type DoctorDirectoryContext = {
  countryName: string;
  countrySlug: string;
  lang: string;
  /** Full, unfiltered country roster. */
  doctors: CountryDoctorCard[];
  /** Ids of services in the GENERAL / SPECIALIST kind, used to derive each
   *  doctor's type chip (same derivation as the homepage carousel). */
  generalServiceIds: string[];
  specialistServiceIds: string[];
  verifyUrl?: string;
  i18n: CommonLocale["doctors"];
};

export type DoctorCardData = {
  name: string;
  title: string;
  imcRegistration?: string;
  registrationDivision?: string;
  registrationVerified?: boolean;
  credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
  medicalRegistrationUrl?: string;
  verificationUrl?: string;
  languages?: string[];
  whatsappNumber?: string;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  bio: string;
  imageSrc?: string | null;
  href?: string;
  bookingHref?: string;
  ctaLabel?: string;
  bookLabel?: string;
};

export type SpotlightData = {
  name: string;
  title: string;
  imcRegistration?: string;
  registrationDivision?: string;
  registrationVerified?: boolean;
  medicalRegistrationUrl?: string;
  verificationUrl?: string;
  credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
  languages?: string[];
  bio: string;
  imageSrc?: string | null;
  href: string;
  bookingHref: string;
  whatsappNumber?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
};

export type DoctorDirectoryView = {
  countryName: string;
  bookingHref: string;
  bookingLabel: string;
  i18n: CommonLocale["doctors"];
  doctorCards: DoctorCardData[];
  spotlight: SpotlightData | null;
  filterGroups: FilterGroup[];
  hasActive: boolean;
  clearHref: string;
  clearLabel: string;
};

/**
 * A doctor passes when it matches EVERY active filter group (AND across
 * groups) and ANY chip within a group (OR within a group). Ported verbatim
 * from the page's former server-side filtering.
 */
export function buildDoctorDirectoryView(
  ctx: DoctorDirectoryContext,
  filterLangsRaw: string[],
  filterTypesRaw: string[],
): DoctorDirectoryView {
  const { countryName, countrySlug, lang, doctors, generalServiceIds, specialistServiceIds, verifyUrl, i18n } = ctx;

  const filterLangs = parseMultiParam(filterLangsRaw).map((s) => languageKey(s));
  const filterTypes = parseMultiParam(filterTypesRaw)
    .map((s) => s.toLowerCase())
    .filter((s): s is DoctorTypeFilter => s === "gp" || s === "specialist");

  // Distinct language codes advertised by at least one doctor in this
  // country — these drive the filter chips. Sorted by display label for a
  // stable, readable order.
  const langOptions = Array.from(
    new Map(
      doctors
        .flatMap((d) => d.languages ?? [])
        .map((token) => [languageKey(token), languageLabel(token)] as const),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // GP / Specialist chips — a doctor's type comes from which service kinds
  // they're assigned to (same derivation as the homepage carousel).
  const generalServiceIdSet = new Set(generalServiceIds);
  const specialistServiceIdSet = new Set(specialistServiceIds);
  function doctorTypes(d: CountryDoctorCard): DoctorTypeFilter[] {
    const types: DoctorTypeFilter[] = [];
    if (d.assignedServiceIds.some((id) => generalServiceIdSet.has(id))) types.push("gp");
    if (d.assignedServiceIds.some((id) => specialistServiceIdSet.has(id))) types.push("specialist");
    return types;
  }
  const hasGPDoctors = doctors.some((d) => doctorTypes(d).includes("gp"));
  const hasSpecialistDoctors = doctors.some((d) => doctorTypes(d).includes("specialist"));

  const filteredDoctors = doctors.filter((d) => {
    const docLangCodes = (d.languages ?? []).map(languageKey);
    const docTypes = doctorTypes(d);
    const langOk =
      filterLangs.length === 0 || filterLangs.some((code) => docLangCodes.includes(code));
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

  const doctorCards: DoctorCardData[] = gridDoctors.map((d) => ({
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
    bio: d.bio ?? `Licensed clinician available for online consultations in ${countryName}.`,
    imageSrc: d.imageSrc,
    href: `/${countrySlug}/${lang}/doctors/${d.slug}`,
    bookingHref: buildBookHref({ country: countrySlug, lang, doctor: d.slug }),
    ctaLabel: i18n.viewProfile,
    bookLabel: i18n.pickTime,
  }));

  const spotlight: SpotlightData | null = featured
    ? {
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
        href: `/${countrySlug}/${lang}/doctors/${featured.slug}`,
        bookingHref: buildBookHref({ country: countrySlug, lang, doctor: featured.slug }),
        whatsappNumber: featured.whatsappNumber,
        instagramUrl: featured.instagramUrl,
        facebookUrl: featured.facebookUrl,
        linkedinUrl: featured.linkedinUrl,
      }
    : null;

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
    return `/${countrySlug}/${lang}/doctors${str ? `?${str}` : ""}`;
  }

  const hasActive = filterLangs.length > 0 || filterTypes.length > 0;

  const filterGroups: FilterGroup[] = [
    {
      // GP / Specialist — each chip only renders when the country actually
      // has a doctor of that type, so a country with GPs only shows just
      // "See a GP" instead of a dead-end "See a Specialist" chip.
      heading: i18n.filterType,
      options: [
        ...(hasGPDoctors
          ? [
              {
                token: "gp",
                label: i18n.filterTypeGP,
                active: filterTypes.includes("gp"),
                href: toggleHref("type", "gp"),
              },
            ]
          : []),
        ...(hasSpecialistDoctors
          ? [
              {
                token: "specialist",
                label: i18n.filterTypeSpecialist,
                active: filterTypes.includes("specialist"),
                href: toggleHref("type", "specialist"),
              },
            ]
          : []),
      ],
    },
    {
      heading: i18n.filterSpeaks,
      options: langOptions.map(([codeKey, label]) => ({
        token: codeKey,
        label,
        active: filterLangs.includes(codeKey),
        href: toggleHref("lang", codeKey),
      })),
    },
  ];

  return {
    countryName,
    bookingHref: buildBookHref({ country: countrySlug, lang }),
    bookingLabel: i18n.bookAppointment,
    i18n,
    doctorCards,
    spotlight,
    filterGroups,
    hasActive,
    clearHref: `/${countrySlug}/${lang}/doctors`,
    clearLabel: i18n.clearFilters,
  };
}
