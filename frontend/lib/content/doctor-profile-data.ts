import { cache } from "react";
import {
  getPublicDoctorBySlug,
  normalizePublicDoctorRecord,
  parseLanguagesFromDoctorBio,
} from "@/lib/content/get-public-doctors";
import { fetchDoctorByCountryAndSlug } from "@/lib/api/site-content-api";
import { isPublicDoctorRecordIndexable } from "@/lib/content/publication-validation";
import { resolveDoctorProfileImageUrl } from "@/lib/content/get-public-assets";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { isSupportedLocale } from "@/lib/content/get-public-page";

export type DoctorProfilePageData = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  profile: {
    name: string;
    title: string;
    country: string;
    languages: string[];
    bio: string;
    qualifications: string[];
    specialties: string[];
    imageLabel: string;
    imcRegistration?: string;
    medicalRegistrationUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    faqs?: Array<{ id: string; question: string; answer: string; category?: string | null }>;
    editorialChecklist?: Record<string, unknown>;
    imageAltText?: string;
    imageTitle?: string;
    imageCaption?: string;
    imageDescription?: string;
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
  /** Local public-folder path from CMS asset when safe (same-origin relative path). */
  profileImageSrc?: string;
  profileImageFocalX?: number;
  profileImageFocalY?: number;
  profileImageZoom?: number;
  /** Optional image shown inside the booking CTA banner. */
  bookingCtaImage?: { src: string; alt: string };
  /**
   * Whether a real clinician record backs this page. False means every field
   * above is placeholder copy derived from the URL slug — see
   * `resolveDoctorProfilePageData`.
   */
  recordFound: boolean;
  /**
   * Whether this profile renders `index,follow`. Computed HERE, from the
   * normalized backend record, so `buildDoctorProfileMetadata` and
   * `app/sitemap.ts` cannot disagree about it — the sitemap feeds the same
   * country-scoped record through the same `isPublicDoctorRecordIndexable`
   * predicate. A placeholder profile (no record) is never indexable.
   */
  indexable: boolean;
  /**
   * True only when the backend positively answered "no such doctor" (404).
   * A transport failure or 5xx leaves this false, so an outage degrades to
   * the placeholder rather than 404ing every real clinician on the site.
   */
  missingConfirmed: boolean;
  /**
   * Set when the requested slug did not resolve but its de-accented form did
   * (e.g. `mudr-vojtěch-černý` → `mudr-vojtech-cerny`). The route redirects
   * to this slug instead of rendering.
   */
  canonicalSlug?: string;
};

/**
 * Slug as the CMS stores it: percent-decoded, de-accented, lowercase.
 * Legacy Wix URLs carried Czech and Portuguese diacritics; the live slugs are
 * ASCII, so a straight lookup misses and used to fall through to a fabricated
 * profile.
 */
/** Honorifics that drifted between the Wix slugs and the CMS ones. */
const DOCTOR_SLUG_HONORIFICS = [
  "mudr-",
  "mudr.-",
  "dr-",
  "dr.-",
  "dra-",
  "dra.-",
  "prof-",
  "mgr-",
  "physiotherapeut-",
];

/**
 * Doctors whose slug changed by more than spelling — a different surname, so
 * no amount of de-accenting or honorific stripping below can bridge it. Keys
 * are de-accented (`asciiDoctorSlug`) legacy slugs that still earn Search
 * Console clicks; values are the live profile slug. Resolution reuses the
 * normal candidate path, so a hit 308s to the canonical URL like any other.
 */
const DOCTOR_SLUG_RENAMES: Record<string, string> = {
  // 16 clicks/quarter at position ~3 on the legacy surname (GSC 2026-08).
  "dr-mohamed-fadzly-mustafar": "dr-mohamed-fadzly-bin-mohamed",
};

/**
 * Alternative slugs to try when the requested one misses, in priority order:
 * an explicit rename, then de-accented, honorific stripped, and honorific
 * normalised to `dr-`. Returns only candidates that differ from the input,
 * deduplicated.
 */
export function doctorSlugCandidates(slug: string): string[] {
  const ascii = asciiDoctorSlug(slug);
  const honorific = DOCTOR_SLUG_HONORIFICS.find((h) => ascii.startsWith(h));
  const bare = honorific ? ascii.slice(honorific.length) : ascii;
  const out: string[] = [];
  for (const candidate of [DOCTOR_SLUG_RENAMES[ascii], ascii, bare, `dr-${bare}`]) {
    if (candidate && candidate !== slug && !out.includes(candidate)) out.push(candidate);
  }
  return out;
}

export function asciiDoctorSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Malformed percent-encoding — fall back to the raw value.
  }
  return decoded
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function toLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Seeded copy only — the resolution flags are set by
// `resolveDoctorProfilePageData`, never by a seed entry.
const doctorSeed: Record<
  string,
  Omit<
    DoctorProfilePageData,
    "hero" | "bottomCta" | "recordFound" | "missingConfirmed" | "indexable"
  >
> = {
  "dr-khoiamul-islam": {
    profile: {
      name: "Dr. Khoiamul Islam",
      title: "General Medicine",
      country: "Ireland",
      languages: ["English"],
      bio: "Supports first-contact online consultations and follow-up care planning for common health concerns.",
      qualifications: [
        "IMC registration details available in clinic onboarding records.",
        "Additional credentials are added when verified profile details are available.",
      ],
      specialties: [
        "General consultation",
        "Follow-up consultation",
        "Referral and continuity planning",
      ],
      imageLabel: "Dr. Khoiamul Islam",
    },
  },
};

export function getDoctorProfileData(
  doctorSlug: string,
  locale?: string,
): DoctorProfilePageData {
  const fallbackName = toLabel(doctorSlug);
  const seeded = doctorSeed[doctorSlug];
  const { common } = loadLocaleBundle(
    locale && isSupportedLocale(locale) ? (locale as LocaleCode) : "en",
  );
  const dp = common.doctorProfile;

  const profile =
    seeded?.profile ?? {
      name: fallbackName,
      title: dp.fallbackTitle ?? "Clinic Doctor Profile",
      country: "Ireland",
      languages: ["English"],
      bio:
        dp.fallbackBio ??
        "This clinician supports online consultations and follow-up guidance through Global Health.",
      qualifications: [
        dp.fallbackQualification1 ??
          "Qualifications and registration details are shown when verified by the clinic team.",
        dp.fallbackQualification2 ?? "Patients can confirm clinician fit during the booking intake.",
      ],
      specialties: [
        dp.fallbackSpecialty1 ?? "General consultation",
        dp.fallbackSpecialty2 ?? "Specialist referral guidance",
        dp.fallbackSpecialty3 ?? "Follow-up support",
      ],
      imageLabel: fallbackName,
    };

  return {
    // Placeholder until `resolveDoctorProfilePageData` confirms a real record.
    recordFound: false,
    missingConfirmed: false,
    indexable: false,
    hero: {
      title: profile.name,
      description:
        dp.heroDescription ??
        "Review doctor profile details, consultation areas, and booking options before scheduling your appointment.",
      primaryCta: { label: dp.bookConsultation ?? "Book consultation", href: "/ireland/en/book" },
      secondaryCta: { label: dp.backToTeamFallback ?? "Back to Ireland team", href: "/ireland-team" },
    },
    profile,
    bottomCta: {
      title: dp.bottomCtaTitle ?? "Need to schedule with this doctor?",
      description:
        dp.bottomCtaDescription ??
        "Book your consultation and the clinic team will confirm the right appointment route based on availability.",
      ctaLabel: dp.startBooking ?? "Start booking",
      ctaHref: "/ireland/en/book",
    },
  };
}

/* `cache()`-wrapped so `buildDoctorProfileMetadata` and `renderDoctorProfilePage`
 * share ONE resolve per render. Without it each side fired its own three
 * parallel backend fetches, and when the metadata copy resolved slower than the
 * page shell React streamed <title>/<link rel=canonical>/<meta description>
 * into the BODY instead of <head> — Google ignores a canonical in <body>.
 * Reproduced on ~30% of /doctors/* and /legal/* URLs under a cold-cache
 * concurrent burst (SEO audit 2026-08-03, myglobalhealth.online-audit/). */
export const resolveDoctorProfilePageData = cache(async function resolveDoctorProfilePageData(
  doctorSlug: string,
  locale?: string,
  countryCode?: string,
): Promise<DoctorProfilePageData> {
  const base = getDoctorProfileData(doctorSlug, locale);
  const { common } = loadLocaleBundle(
    locale && isSupportedLocale(locale) ? (locale as LocaleCode) : "en",
  );
  const backToTeam = common.doctorProfile.backToTeam;
  // `status` distinguishes a real 404 from an outage — only the former may
  // 404 the page (see `missingConfirmed`).
  let countryFetchStatus: number | undefined;
  const [countryScopedDoctor, globalDoctor, profileImageSrc] = await Promise.all([
    countryCode
      ? fetchDoctorByCountryAndSlug(countryCode, doctorSlug, locale).then((res) => {
          if (res.ok) return normalizePublicDoctorRecord(res.data.doctor);
          countryFetchStatus = res.status;
          return undefined;
        })
      : Promise.resolve(undefined),
    getPublicDoctorBySlug(doctorSlug, locale),
    resolveDoctorProfileImageUrl(doctorSlug),
  ]);
  const backend = countryScopedDoctor ?? globalDoctor;

  if (!backend) {
    const out: DoctorProfilePageData = profileImageSrc ? { ...base, profileImageSrc } : { ...base };
    if (profileImageSrc) {
      out.bookingCtaImage = { src: profileImageSrc, alt: base.profile.name };
    }
    out.recordFound = false;
    out.missingConfirmed = countryFetchStatus === 404;

    // Legacy Wix URLs differ from the live slugs in two mechanical ways:
    // diacritics (`…/mudr-vojtěch-černý` vs `mudr-vojtech-cerny`) and
    // honorific drift (`mudr-ahmed-maklad` vs `dr-ahmed-maklad`,
    // `dra-beatriz-carvalho` vs `beatriz-carvalho`). Try those variants before
    // 404ing so the inbound links land on the real clinician. A genuine
    // rename or a departed doctor still 404s — that is correct.
    for (const candidate of doctorSlugCandidates(doctorSlug)) {
      const retry = countryCode
        ? await fetchDoctorByCountryAndSlug(countryCode, candidate, locale).then((res) =>
            res.ok ? normalizePublicDoctorRecord(res.data.doctor) : undefined,
          )
        : await getPublicDoctorBySlug(candidate, locale);
      if (retry) {
        out.canonicalSlug = candidate;
        out.missingConfirmed = false;
        break;
      }
    }
    return out;
  }

  const out: DoctorProfilePageData = {
    ...base,
    recordFound: true,
    missingConfirmed: false,
    // The global roster (`getPublicDoctorBySlug`) carries no per-market
    // registration fields at all, so it can NEVER satisfy the credentials rule.
    // When we are on that record only because the country-scoped read failed
    // for a non-404 reason, judging indexability from it stamps
    // `noindex,nofollow` on a live, self-canonical profile for the duration of
    // a backend blip — the same "temporary problem, permanent signal" mistake
    // `PublicContentUnavailableError` exists to prevent, and it is exactly what
    // an 8-concurrent crawl reproduced on six doctor URLs. A transient failure
    // leaves the profile indexable; a confirmed 404 for this market does not.
    indexable:
      countryScopedDoctor || !countryCode
        ? isPublicDoctorRecordIndexable(backend)
        : countryFetchStatus !== 404,
    ...(profileImageSrc ? { profileImageSrc } : {}),
    hero: {
      ...base.hero,
      title: backend.fullName,
      secondaryCta: {
        label: backToTeam.replace("{country}", backend.countryName),
        href: backend.teamPath,
      },
    },
    profile: {
      ...base.profile,
      name: backend.fullName,
      title: backend.title,
      country: backend.countryName,
      bio: backend.bio ?? "",
      languages:
        backend.languages && backend.languages.length > 0
          ? backend.languages
          : (parseLanguagesFromDoctorBio(backend.bio) ?? []),
      qualifications: backend.qualifications ?? [],
      specialties: backend.specialties,
      imageLabel: backend.fullName,
      ...(backend.imcRegistration ? { imcRegistration: backend.imcRegistration } : {}),
      ...(backend.medicalRegistrationUrl ? { medicalRegistrationUrl: backend.medicalRegistrationUrl } : {}),
      ...(backend.seoTitle ? { seoTitle: backend.seoTitle } : {}),
      ...(backend.seoDescription ? { seoDescription: backend.seoDescription } : {}),
      ...(backend.seoKeywords ? { seoKeywords: backend.seoKeywords } : {}),
      ...(backend.faqs ? { faqs: backend.faqs } : {}),
      ...(backend.editorialChecklist ? { editorialChecklist: backend.editorialChecklist } : {}),
      imageAltText: backend.profileImageAltText ?? backend.fullName,
      ...(backend.profileImageTitle ? { imageTitle: backend.profileImageTitle } : {}),
      ...(backend.profileImageCaption ? { imageCaption: backend.profileImageCaption } : {}),
      ...(backend.profileImageDescription
        ? { imageDescription: backend.profileImageDescription }
        : {}),
    },
  };

  const resolvedImageSrc = backend.profileImageSrc ?? profileImageSrc;
  if (resolvedImageSrc) {
    out.profileImageSrc = resolvedImageSrc;
    out.profileImageFocalX = backend.profileImageFocalX;
    out.profileImageFocalY = backend.profileImageFocalY;
    out.profileImageZoom = backend.profileImageZoom;
    out.bookingCtaImage = {
      src: resolvedImageSrc,
      alt: backend.profileImageAltText ?? backend.fullName,
    };
  }

  return out;
});
