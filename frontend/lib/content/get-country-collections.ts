import { cache } from "react";
import {
  fetchDoctorsByCountry,
  fetchHealthTestsByCountry,
  fetchHealthTestDetail,
  fetchLandingPage,
  fetchLandingSlugs,
  fetchServiceDetail,
  fetchServicesByCountry,
  fetchSpecialtiesByCountry,
} from "@/lib/api/site-content-api";
import {
  assertAbsenceConfirmed,
  logPublicContentFallback,
  missingRecordOn200,
} from "@/lib/content/public-content-source";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { marketDisplayName } from "@/lib/content/doctor-market-name";

/**
 * Data-driven country collections used by the country-scoped landing pages
 * (general consultation, specialist consultation, doctors index, home, ...).
 *
 * Each function returns a normalized array shaped for the existing
 * `ServicesGrid` / `SpecialtiesGrid` / `DoctorsSection` components — pages
 * stay thin, presentational components stay reusable.
 */

export type CountryServiceCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY";
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  imageSrc?: string;
  imageAltText?: string;
  imageTitle?: string;
  imageCaption?: string;
  imageDescription?: string;
  /** Doctor IDs bookable for this service. Empty array = no assignment
   *  yet; the public consult flow will show "no doctors available". */
  assignedDoctorIds: string[];
  /** Insurance companies that cover this service + the negotiated price the
   *  patient pays if they select that company at booking. Empty = none. */
  insuranceOptions: InsuranceOption[];
  bookability: BookabilitySummary;
};

export type BookabilityState = "BOOKABLE" | "RETURNING" | "UNAVAILABLE";

export type BookabilityReasonCode =
  | "COUNTRY_PAUSED"
  | "DOCTOR_PAUSED"
  | "SERVICE_PAUSED"
  | "NO_APPROVED_DOCTOR"
  | "NO_OPEN_SLOT";

export type BookabilitySummary = {
  state: BookabilityState;
  reasonCode: BookabilityReasonCode | null;
  nextAvailableAt: string | null;
};

const FALLBACK_BOOKABILITY: BookabilitySummary = {
  state: "UNAVAILABLE",
  reasonCode: "NO_OPEN_SLOT",
  nextAvailableAt: null,
};

const BOOKABILITY_STATES = new Set<BookabilityState>([
  "BOOKABLE",
  "RETURNING",
  "UNAVAILABLE",
]);

const BOOKABILITY_REASON_CODES = new Set<BookabilityReasonCode>([
  "COUNTRY_PAUSED",
  "DOCTOR_PAUSED",
  "SERVICE_PAUSED",
  "NO_APPROVED_DOCTOR",
  "NO_OPEN_SLOT",
]);

const UNAVAILABLE_BOOKABILITY: BookabilitySummary = {
  state: "UNAVAILABLE",
  reasonCode: "NO_OPEN_SLOT",
  nextAvailableAt: null,
};

function parseBookabilitySummary(value: unknown): BookabilitySummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.state !== "string" || !BOOKABILITY_STATES.has(raw.state as BookabilityState)) {
    return null;
  }
  if (
    raw.reasonCode !== null &&
    (typeof raw.reasonCode !== "string" ||
      !BOOKABILITY_REASON_CODES.has(raw.reasonCode as BookabilityReasonCode))
  ) {
    return null;
  }
  if (
    raw.nextAvailableAt !== null &&
    (typeof raw.nextAvailableAt !== "string" || Number.isNaN(Date.parse(raw.nextAvailableAt)))
  ) {
    return null;
  }
  return {
    state: raw.state as BookabilityState,
    reasonCode: raw.reasonCode as BookabilityReasonCode | null,
    nextAvailableAt: raw.nextAvailableAt as string | null,
  };
}

/**
 * Runtime boundary for public API payloads. Missing or malformed summaries
 * fail closed: the page remains visible, but a missing/malformed operational
 * summary must never create an active booking claim.
 */
export function normalizeBookabilitySummary(value: unknown): BookabilitySummary {
  return parseBookabilitySummary(value) ?? { ...FALLBACK_BOOKABILITY };
}

export function normalizeBookabilityByServiceId(
  value: unknown,
): Record<string, BookabilitySummary> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, BookabilitySummary> = {};
  for (const [serviceId, summary] of Object.entries(value as Record<string, unknown>)) {
    const parsed = parseBookabilitySummary(summary);
    if (serviceId && parsed) out[serviceId] = parsed;
  }
  return out;
}

/** Service-specific booking links must never inherit a doctor's aggregate state. */
export function getDoctorServiceBookability(
  byServiceId: Readonly<Record<string, BookabilitySummary>>,
  serviceId: string,
): BookabilitySummary {
  return byServiceId[serviceId] ?? { ...UNAVAILABLE_BOOKABILITY };
}

/** One selectable insurance company for a covered service (public payload). */
export type InsuranceOption = {
  companyId: string;
  name: string;
  insurancePriceCents: number;
};

export type CountryHealthTestCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceCents: number;
  currencyCode: string;
  sampleType: string | null;
  resultsTimeline: string | null;
  imageSrc: string | null;
  /** null = unlimited inventory; 0 = sold out; <=5 surfaces a "Only N
   *  left" badge on the public card. */
  stock: number | null;
  /** Last edit to the test row; null when absent from the API payload.
   *  Dates the lab-test sitemap entries. */
  updatedAt: string | null;
};

export type ServiceFaq = { id: string; question: string; answer: string };

/** Contextual internal-link callout shown on a service page. */
export type ServiceLinkItem = {
  id: string;
  type: "UPGRADE" | "ENTRY" | "REFERRAL" | "COMPLEMENTARY";
  anchorSlot: string | null;
  heading: string;
  body: string | null;
  ctaLabel: string;
  /** Same-country target service slug (frontend builds the URL). */
  targetSlug: string | null;
  /** Explicit href fallback (e.g. an SEO landing page). */
  targetHref: string | null;
};

function readServiceLinks(value: unknown): ServiceLinkItem[] {
  if (!Array.isArray(value)) return [];
  const types = new Set(["UPGRADE", "ENTRY", "REFERRAL", "COMPLEMENTARY"]);
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (
      typeof r.id !== "string" ||
      typeof r.type !== "string" ||
      !types.has(r.type) ||
      typeof r.heading !== "string" ||
      typeof r.ctaLabel !== "string"
    ) {
      return [];
    }
    return [
      {
        id: r.id,
        type: r.type as ServiceLinkItem["type"],
        anchorSlot: typeof r.anchorSlot === "string" ? r.anchorSlot : null,
        heading: r.heading,
        body: typeof r.body === "string" ? r.body : null,
        ctaLabel: r.ctaLabel,
        targetSlug: typeof r.targetSlug === "string" ? r.targetSlug : null,
        targetHref: typeof r.targetHref === "string" ? r.targetHref : null,
      },
    ];
  });
}

/** Full service detail (admin CMS content) for the public service page. */
export type CountryServiceDetail = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY";
  heroTitle: string | null;
  heroDescription: string | null;
  /** Sanitized rich HTML authored in admin. Safe for scoped innerHTML. */
  detailBody: string | null;
  ctaLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  imageSrc: string | null;
  gallery: string[];
  faqs: ServiceFaq[];
  links: ServiceLinkItem[];
  /** Insurance companies covering this service + their negotiated prices. */
  insuranceOptions: InsuranceOption[];
  /** Auto SEO line ("We also have … for this service.") or null when none. */
  insuranceSeoLine: string | null;
  /** ISO timestamp — admin-set clinical review date. Null when unset. */
  lastReviewedAt: string | null;
  /** Named author / clinical reviewer for this service's content — free-text
   *  fallback plus the linked Doctor id (when set), driving the public
   *  Physician author/reviewedBy JSON-LD (see structured-data.ts). */
  authorDisplayName: string | null;
  reviewerDisplayName: string | null;
  authorDoctorId: string | null;
  reviewerDoctorId: string | null;
  /** `PUBLIC` for anything the public endpoint returns. */
  visibility: string | null;
  /** Locale that actually supplied this row's content, and the display fields
   *  the requested locale's own translation row provided. Both feed the shared
   *  per-locale publication rule — see `PublicServiceLocaleRecord`. */
  resolvedLocale: string | null;
  translatedFields: string[] | null;
  bookability: BookabilitySummary;
};

export type HealthTestFaqItem = { id: string; question: string; answer: string };

/** Full health-test detail (admin CMS content) for the public test page. */
/** One "extra section" block. `kind` selects a richer layout on the health
 *  test detail page; absent means plain prose. */
export type ExtraSection = { title: string; body: string; kind?: "steps" | "notes" };

export type CountryHealthTestDetail = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  detailIntro: string | null;
  heroButtonLabel: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  priceCents: number;
  currencyCode: string;
  stock: number | null;
  imageSrc: string | null;
  gallery: string[];
  whatThisTestCovers: string[];
  whyGetTested: string[];
  /** Admin "extra sections" JSON — array of { title, body } when authored. */
  extraSections: ExtraSection[];
  faqs: HealthTestFaqItem[];
};

export type CountrySpecialtyCard = {
  id: string;
  slug: string;
  name: string;
  cardSummary: string | null;
  cardThemeColor: string | null;
};

export type CountryDoctorCard = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string | null;
  languages: string[];
  specialties: string[];
  imageSrc?: string;
  imageAltText?: string;
  imageTitle?: string;
  imageCaption?: string;
  imageDescription?: string;
  imageFocalX?: number;
  imageFocalY?: number;
  imageZoom?: number;
  /** Service IDs the doctor is bookable for, in admin-defined sort
   *  order. Empty array means no current ServiceDoctor assignments. */
  assignedServiceIds: string[];
  /** Formatted as "CHAMBER | NUMBER" (e.g. "IMC | 523449") when both
   *  fields are set on the DoctorCountry row, otherwise just the number. */
  imcRegistration?: string;
  /** Raw registration number + chamber (e.g. "523449", "IMC") — unformatted,
   *  for schema/identifier use. `imcRegistration` is the display string. */
  registrationNumber?: string;
  registrationChamber?: string;
  /** Register division/scope (IMC General/Specialist Division) where set. */
  registrationDivision?: string;
  /** Admin-verified registration flag (sighted documentation). */
  registrationVerified?: boolean;
  /** Confirmed extra professional credentials (FRCP, SPC fellowship, …)
   *  scoped to this country. Only admin-confirmed entries. */
  credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
  medicalRegistrationUrl?: string;
  whatsappNumber?: string;
  /** Optional social profile URLs surfaced on doctor cards + clinic
   *  pages. Each is an absolute https:// URL pulled from the Doctor
   *  row. Admin sets them via the doctor edit form. */
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  /** Admin-chosen featured doctor for the country (stored in the Setting
   *  table). The /doctors page promotes the featured row into the
   *  FeaturedDoctor spotlight. */
  isFeatured?: boolean;
  /** `editorialChecklist.nonPhysician` — roster member who is not a registered
   *  physician (manual therapist, rehabilitation consultant). Drives the
   *  `Person`-instead-of-`Physician` schema node and waives the medical
   *  registration requirement in `validatePublicDoctorRecord`. */
  nonPhysician?: boolean;
  bookability: BookabilitySummary;
  bookabilityByServiceId: Record<string, BookabilitySummary>;
};

function readSpecialtyName(row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return typeof r.name === "string" ? r.name : null;
}

function pickImage(row: unknown):
  | {
      src: string;
      altText?: string;
      title?: string;
      caption?: string;
      description?: string;
      focalX: number;
      focalY: number;
      zoom: number;
    }
  | undefined {
  const assets = (row as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) return undefined;
  // Backend orders active profile images newest-first. Trust that order
  // so a newer doctor-uploaded photo cannot be overridden by an older
  // canonical admin key.
  for (const a of assets) {
    if (!a || typeof a !== "object") continue;
    const rec = a as {
      kind?: unknown;
      path?: unknown;
      altText?: unknown;
      title?: unknown;
      caption?: unknown;
      description?: unknown;
      focalX?: unknown;
      focalY?: unknown;
      zoom?: unknown;
    };
    if (rec.kind !== "IMAGE" || typeof rec.path !== "string") continue;
    const resolved = resolveTrustedAssetUrl(rec.path);
    if (!resolved) continue;
    return {
      src: resolved,
      ...(typeof rec.altText === "string" && rec.altText.trim()
        ? { altText: rec.altText.trim() }
        : {}),
      ...(typeof rec.title === "string" && rec.title.trim()
        ? { title: rec.title.trim() }
        : {}),
      ...(typeof rec.caption === "string" && rec.caption.trim()
        ? { caption: rec.caption.trim() }
        : {}),
      ...(typeof rec.description === "string" && rec.description.trim()
        ? { description: rec.description.trim() }
        : {}),
      focalX: typeof rec.focalX === "number" ? rec.focalX : 50,
      focalY: typeof rec.focalY === "number" ? rec.focalY : 50,
      zoom: typeof rec.zoom === "number" ? rec.zoom : 1,
    };
  }
  return undefined;
}

function pickImagePath(row: unknown): string | undefined {
  return pickImage(row)?.src;
}

const SERVICE_KINDS: ReadonlySet<CountryServiceCard["kind"]> = new Set([
  "GENERAL",
  "SPECIALIST",
  "PRESCRIPTION",
  "HEALTH_TEST",
  "HOME_DELIVERY",
]);

/** Services for a country. Pass a `kind` to filter server-side, or `undefined`
 *  to fetch every kind in ONE query and partition in memory (the homepage does
 *  this instead of three per-kind round-trips). Skips inactive rows. When a
 *  locale is passed the backend returns display fields merged to that
 *  language (falling back to the country default). */
export const getCountryServices = cache(async (
  countryCode: string,
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY" | undefined,
  locale?: string,
): Promise<CountryServiceCard[]> => {
  const res = await fetchServicesByCountry(countryCode, kind, locale);
  if (!res.ok) {
    logPublicContentFallback(`country-services:${countryCode}:${kind ?? "all"}`, res.message);
    return [];
  }
  const out: CountryServiceCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.name !== "string") continue;
    if (r.isActive === false) continue;
    const assignedDoctorIds: string[] = [];
    const assignments = r.assignedDoctors;
    if (Array.isArray(assignments)) {
      for (const a of assignments) {
        if (!a || typeof a !== "object") continue;
        const id = (a as { doctorId?: unknown }).doctorId;
        if (typeof id === "string" && id.length > 0) assignedDoctorIds.push(id);
      }
    }
    // Kind comes off the row (present on every service payload) so an
    // all-kinds fetch (kind === undefined) still buckets correctly; fall
    // back to the requested filter, then GENERAL, for older payloads.
    const rowKind =
      typeof r.kind === "string" && SERVICE_KINDS.has(r.kind as CountryServiceCard["kind"])
        ? (r.kind as CountryServiceCard["kind"])
        : undefined;
    const image = pickImage(row);
    out.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      summary: typeof r.summary === "string" ? r.summary : "",
      kind: rowKind ?? kind ?? "GENERAL",
      durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : null,
      basePriceCents: typeof r.basePriceCents === "number" ? r.basePriceCents : null,
      currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : null,
      imageSrc: image?.src,
      ...(image?.altText ? { imageAltText: image.altText } : {}),
      ...(image?.title ? { imageTitle: image.title } : {}),
      ...(image?.caption ? { imageCaption: image.caption } : {}),
      ...(image?.description ? { imageDescription: image.description } : {}),
      assignedDoctorIds,
      insuranceOptions: parseInsuranceOptions(r.insuranceOptions),
      bookability: normalizeBookabilitySummary(r.bookability),
    });
  }
  return out;
});

/** Defensively parse the server's `insuranceOptions` array off a raw payload. */
function parseInsuranceOptions(raw: unknown): InsuranceOption[] {
  if (!Array.isArray(raw)) return [];
  const out: InsuranceOption[] = [];
  for (const o of raw) {
    if (!o || typeof o !== "object") continue;
    const { companyId, name, insurancePriceCents } = o as Record<string, unknown>;
    if (
      typeof companyId === "string" &&
      typeof name === "string" &&
      typeof insurancePriceCents === "number"
    ) {
      out.push({ companyId, name, insurancePriceCents });
    }
  }
  return out;
}

/** Specialties (categories) for a country. */
export const getCountrySpecialties = cache(async (
  countryCode: string,
  locale?: string,
): Promise<CountrySpecialtyCard[]> => {
  const res = await fetchSpecialtiesByCountry(countryCode, locale);
  if (!res.ok) {
    logPublicContentFallback(`country-specialties:${countryCode}`, res.message);
    return [];
  }
  const out: CountrySpecialtyCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.name !== "string") continue;
    if (r.active === false) continue;
    out.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      cardSummary: typeof r.cardSummary === "string" ? r.cardSummary : null,
      cardThemeColor: typeof r.cardThemeColor === "string" ? r.cardThemeColor : null,
    });
  }
  return out;
});

/** Doctors active in a country, scoped via the country-scoped backend endpoint. */
export const getCountryDoctors = cache(async (
  countryCode: string,
  locale?: string,
): Promise<CountryDoctorCard[]> => {
  const res = await fetchDoctorsByCountry(countryCode, locale);
  if (!res.ok) {
    logPublicContentFallback(`country-doctors:${countryCode}`, res.message);
    return [];
  }
  const out: CountryDoctorCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.fullName !== "string" || typeof r.title !== "string") continue;
    if (r.active === false) continue;
    const specialties: string[] = [];
    const specs = r.specialties;
    if (Array.isArray(specs)) {
      for (const link of specs) {
        const name = readSpecialtyName((link as { specialty?: unknown })?.specialty);
        if (name) specialties.push(name);
      }
    }
    const languages = Array.isArray(r.languages)
      ? r.languages.filter((v): v is string => typeof v === "string")
      : [];
    const assignedServiceIds: string[] = [];
    const assignments = r.assignedServices;
    if (Array.isArray(assignments)) {
      for (const a of assignments) {
        if (!a || typeof a !== "object") continue;
        const id = (a as { serviceId?: unknown }).serviceId;
        if (typeof id === "string" && id.length > 0) assignedServiceIds.push(id);
      }
    }
    // Registration: backend computes imcRegistration = DoctorCountry.registrationNumber
    // for the queried country. chamberEntity (e.g. "IMC", "OMC") lives on the same row.
    const regNum =
      typeof r.imcRegistration === "string" && r.imcRegistration.trim()
        ? r.imcRegistration.trim()
        : null;
    const additionals = Array.isArray(r.additionalCountries) ? r.additionalCountries : [];
    const link = additionals[0] as { chamberEntity?: string | null } | undefined;
    const chamberEntity =
      typeof link?.chamberEntity === "string" && link.chamberEntity.trim()
        ? link.chamberEntity.trim()
        : null;
    const imcRegistration = regNum
      ? chamberEntity
        ? `${chamberEntity} | ${regNum}`
        : regNum
      : undefined;

    const registrationDivision =
      typeof r.registrationDivision === "string" && r.registrationDivision.trim()
        ? r.registrationDivision.trim()
        : undefined;
    const credentials = Array.isArray(r.credentials)
      ? r.credentials
          .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
          .map((c) => ({
            label: typeof c.label === "string" ? c.label : "",
            bodyName: typeof c.bodyName === "string" ? c.bodyName : "",
            bodyUrl: typeof c.bodyUrl === "string" ? c.bodyUrl : undefined,
          }))
          .filter((c) => c.label && c.bodyName)
      : [];
    const image = pickImage(row);

    out.push({
      id: r.id,
      slug: r.slug,
      fullName: marketDisplayName(r.slug, countryCode, r.fullName),
      title: r.title,
      bio: typeof r.bio === "string" ? r.bio : null,
      languages,
      specialties,
      imageSrc: image?.src,
      ...(image?.altText ? { imageAltText: image.altText } : {}),
      ...(image?.title ? { imageTitle: image.title } : {}),
      ...(image?.caption ? { imageCaption: image.caption } : {}),
      ...(image?.description ? { imageDescription: image.description } : {}),
      imageFocalX: image?.focalX ?? 50,
      imageFocalY: image?.focalY ?? 50,
      imageZoom: image?.zoom ?? 1,
      assignedServiceIds,
      bookability: normalizeBookabilitySummary(r.bookability),
      bookabilityByServiceId: normalizeBookabilityByServiceId(r.bookabilityByServiceId),
      isFeatured: r.isFeatured === true,
      ...(r.editorialChecklist &&
      typeof r.editorialChecklist === "object" &&
      (r.editorialChecklist as Record<string, unknown>).nonPhysician === true
        ? { nonPhysician: true }
        : {}),
      ...(imcRegistration ? { imcRegistration } : {}),
      ...(regNum ? { registrationNumber: regNum } : {}),
      ...(chamberEntity ? { registrationChamber: chamberEntity } : {}),
      ...(registrationDivision ? { registrationDivision } : {}),
      ...(r.registrationVerified === true ? { registrationVerified: true } : {}),
      ...(credentials.length > 0 ? { credentials } : {}),
      ...(typeof r.medicalRegistrationUrl === "string" && r.medicalRegistrationUrl.trim()
        ? { medicalRegistrationUrl: r.medicalRegistrationUrl.trim() }
        : {}),
      ...(typeof r.whatsappNumber === "string" && r.whatsappNumber.trim()
        ? { whatsappNumber: r.whatsappNumber.trim() }
        : {}),
      ...(typeof r.instagramUrl === "string" && r.instagramUrl.trim()
        ? { instagramUrl: r.instagramUrl.trim() }
        : {}),
      ...(typeof r.facebookUrl === "string" && r.facebookUrl.trim()
        ? { facebookUrl: r.facebookUrl.trim() }
        : {}),
      ...(typeof r.linkedinUrl === "string" && r.linkedinUrl.trim()
        ? { linkedinUrl: r.linkedinUrl.trim() }
        : {}),
    });
  }
  return out;
});

/** Health tests for a country. Maps the HealthTest model to a card shape. */
export const getCountryHealthTests = cache(async (
  countryCode: string,
  locale?: string,
): Promise<CountryHealthTestCard[]> => {
  const res = await fetchHealthTestsByCountry(countryCode, locale);
  if (!res.ok) {
    logPublicContentFallback(`country-health-tests:${countryCode}`, res.message);
    return [];
  }
  const out: CountryHealthTestCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.title !== "string") continue;
    if (r.isActive === false) continue;
    const imagePath = typeof r.productImagePath === "string" ? r.productImagePath : null;
    out.push({
      id: r.id,
      slug: r.slug,
      title: r.title,
      shortDescription: typeof r.shortDescription === "string" ? r.shortDescription : null,
      priceCents: typeof r.priceCents === "number" ? r.priceCents : 0,
      currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : "EUR",
      sampleType: typeof r.sampleType === "string" ? r.sampleType : null,
      resultsTimeline: typeof r.resultsTimeline === "string" ? r.resultsTimeline : null,
      imageSrc: imagePath ? resolveTrustedAssetUrl(imagePath) ?? null : null,
      stock: typeof r.stock === "number" ? r.stock : null,
      updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
    });
  }
  return out;
});

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function resolveGallery(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const p of value) {
    if (typeof p !== "string") continue;
    const resolved = resolveTrustedAssetUrl(p);
    if (resolved) out.push(resolved);
  }
  return out;
}

/** Parse the admin `extraSections` JSON into a list of titled prose blocks.
 *  Tolerates either { title, body } or { heading, content } shapes; skips
 *  entries without renderable text. An optional `kind` ("steps" | "notes")
 *  lets a seeded section pick a richer layout; admin-authored sections have
 *  no kind and keep rendering as plain prose. */
function readExtraSections(value: unknown): ExtraSection[] {
  if (!Array.isArray(value)) return [];
  const out: ExtraSection[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const title =
      typeof r.title === "string" ? r.title : typeof r.heading === "string" ? r.heading : "";
    const body =
      typeof r.body === "string" ? r.body : typeof r.content === "string" ? r.content : "";
    if (!body.trim() && !title.trim()) continue;
    const kind = r.kind === "steps" || r.kind === "notes" ? r.kind : undefined;
    out.push({ title, body, kind });
  }
  return out;
}

function readFaqs(value: unknown): ServiceFaq[] {
  if (!Array.isArray(value)) return [];
  const out: ServiceFaq[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    if (typeof r.question !== "string" || typeof r.answer !== "string") continue;
    out.push({
      id: typeof r.id === "string" ? r.id : r.question,
      question: r.question,
      answer: r.answer,
    });
  }
  return out;
}

/** Single service detail (admin CMS content) for the public service page.
 *  Returns null ONLY when the backend confirmed the slug doesn't resolve for
 *  this country; throws `PublicContentUnavailableError` when it couldn't
 *  answer (see public-content-source.ts). */
export const getCountryServiceDetail = cache(async (
  countryCode: string,
  slug: string,
  locale?: string,
): Promise<CountryServiceDetail | null> => {
  const entity = `service-detail:${countryCode}:${slug}`;
  const res = await fetchServiceDetail(slug, countryCode, locale);
  if (!res.ok) {
    assertAbsenceConfirmed(entity, res);
    logPublicContentFallback(entity, res.message);
    return null;
  }
  const row = res.data.service;
  if (!row || typeof row !== "object") missingRecordOn200(entity);
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.slug !== "string" || typeof r.name !== "string") {
    missingRecordOn200(entity);
  }
  const kind = typeof r.kind === "string" ? r.kind : "GENERAL";
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    summary: typeof r.summary === "string" ? r.summary : "",
    kind: kind as CountryServiceDetail["kind"],
    heroTitle: typeof r.heroTitle === "string" ? r.heroTitle : null,
    heroDescription: typeof r.heroDescription === "string" ? r.heroDescription : null,
    detailBody: typeof r.detailBody === "string" ? r.detailBody : null,
    ctaLabel: typeof r.ctaLabel === "string" ? r.ctaLabel : null,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    seoKeywords: Array.isArray(r.seoKeywords)
      ? r.seoKeywords.filter((x): x is string => typeof x === "string")
      : [],
    durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : null,
    basePriceCents: typeof r.basePriceCents === "number" ? r.basePriceCents : null,
    currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : null,
    imageSrc: pickImagePath(row) ?? null,
    gallery: resolveGallery(r.galleryImagePaths),
    faqs: readFaqs(r.faqs),
    links: readServiceLinks(r.links),
    insuranceOptions: parseInsuranceOptions(r.insuranceOptions),
    insuranceSeoLine: typeof r.insuranceSeoLine === "string" ? r.insuranceSeoLine : null,
    lastReviewedAt: typeof r.lastReviewedAt === "string" ? r.lastReviewedAt : null,
    authorDisplayName: typeof r.authorDisplayName === "string" ? r.authorDisplayName : null,
    reviewerDisplayName: typeof r.reviewerDisplayName === "string" ? r.reviewerDisplayName : null,
    authorDoctorId: typeof r.authorDoctorId === "string" ? r.authorDoctorId : null,
    reviewerDoctorId: typeof r.reviewerDoctorId === "string" ? r.reviewerDoctorId : null,
    visibility: typeof r.visibility === "string" ? r.visibility : null,
    resolvedLocale: typeof r.resolvedLocale === "string" ? r.resolvedLocale : null,
    translatedFields: Array.isArray(r.translatedFields)
      ? r.translatedFields.filter((f): f is string => typeof f === "string")
      : null,
    bookability: normalizeBookabilitySummary(r.bookability),
  };
});

/** SEO landing page (condition/audience marketing page) for the public site. */
/** Landing page template config — drives the doctor grid / CTA / related
 *  links blocks. All fields optional. */
export type CountryLandingPageTemplate = {
  doctorLanguage?: string;
  doctorSlugs?: string[];
  ctaService?: string;
  related?: Array<{ label: string; href: string }>;
};

export type CountryLandingPage = {
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  bodyHtml: string | null;
  template: CountryLandingPageTemplate | null;
  faq: Array<{ question: string; answer: string }> | null;
  /** Locale that actually supplied this content (see `resolveTranslation`
   *  backend-side) — `null` only when the backend predates the field. */
  resolvedLocale: string | null;
};

function readLandingTemplate(v: unknown): CountryLandingPageTemplate | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const out: CountryLandingPageTemplate = {};
  if (typeof r.doctorLanguage === "string") out.doctorLanguage = r.doctorLanguage;
  if (Array.isArray(r.doctorSlugs)) {
    out.doctorSlugs = r.doctorSlugs.filter((s): s is string => typeof s === "string");
  }
  if (typeof r.ctaService === "string") out.ctaService = r.ctaService;
  if (Array.isArray(r.related)) {
    out.related = r.related
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const e = item as Record<string, unknown>;
        return typeof e.label === "string" && typeof e.href === "string"
          ? { label: e.label, href: e.href }
          : null;
      })
      .filter((v): v is { label: string; href: string } => v !== null);
  }
  return out;
}

function readLandingFaq(v: unknown): Array<{ question: string; answer: string }> | null {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const e = item as Record<string, unknown>;
      return typeof e.question === "string" && typeof e.answer === "string"
        ? { question: e.question, answer: e.answer }
        : null;
    })
    .filter((v): v is { question: string; answer: string } => v !== null);
  return out.length > 0 ? out : null;
}

export const getCountryLandingPage = cache(async (
  countryCode: string,
  slug: string,
  locale?: string,
): Promise<CountryLandingPage | null> => {
  const entity = `landing:${countryCode}:${slug}`;
  const res = await fetchLandingPage(slug, countryCode, locale);
  if (!res.ok) {
    assertAbsenceConfirmed(entity, res);
    logPublicContentFallback(entity, res.message);
    return null;
  }
  const p = res.data.page;
  if (!p || typeof p !== "object") missingRecordOn200(entity);
  const r = p as Record<string, unknown>;
  if (typeof r.slug !== "string" || typeof r.title !== "string") missingRecordOn200(entity);
  return {
    slug: r.slug,
    title: r.title,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    bodyHtml: typeof r.bodyHtml === "string" ? r.bodyHtml : null,
    template: readLandingTemplate(r.template),
    faq: readLandingFaq(r.faq),
    resolvedLocale: typeof r.resolvedLocale === "string" ? r.resolvedLocale : null,
  };
});

/**
 * Which locales have a genuine translation row for a country's landing page —
 * the same `availableLocales` the sitemap uses, reused here so a single
 * `/health/[slug]` page's indexability/hreflang decision can never disagree
 * with what's actually submitted to Google. One request per country (not per
 * locale), cached per-request like every other collection here.
 */
export const getLandingAvailableLocales = cache(async (
  countryCode: string,
  slug: string,
): Promise<string[]> => {
  const res = await fetchLandingSlugs(countryCode);
  if (!res.ok) return [];
  const page = res.data.landingPages.find((p) => p.slug === slug);
  return page?.availableLocales.map((l) => l.toLowerCase()) ?? [];
});

/** Single health-test detail (admin CMS content) for the public test page.
 *  Returns null ONLY when the backend confirmed the slug doesn't resolve for
 *  this country; throws `PublicContentUnavailableError` when it couldn't
 *  answer (see public-content-source.ts). */
export const getCountryHealthTestDetail = cache(async (
  countryCode: string,
  slug: string,
  locale?: string,
): Promise<CountryHealthTestDetail | null> => {
  const entity = `health-test-detail:${countryCode}:${slug}`;
  const res = await fetchHealthTestDetail(slug, countryCode, locale);
  if (!res.ok) {
    assertAbsenceConfirmed(entity, res);
    logPublicContentFallback(entity, res.message);
    return null;
  }
  const row = res.data.healthTest;
  if (!row || typeof row !== "object") missingRecordOn200(entity);
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.slug !== "string" || typeof r.title !== "string") {
    missingRecordOn200(entity);
  }
  const imagePath = typeof r.productImagePath === "string" ? r.productImagePath : null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: typeof r.shortDescription === "string" ? r.shortDescription : null,
    detailIntro: typeof r.detailIntro === "string" ? r.detailIntro : null,
    heroButtonLabel: typeof r.heroButtonLabel === "string" ? r.heroButtonLabel : null,
    sampleType: typeof r.sampleType === "string" ? r.sampleType : null,
    resultsTimeline: typeof r.resultsTimeline === "string" ? r.resultsTimeline : null,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    priceCents: typeof r.priceCents === "number" ? r.priceCents : 0,
    currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : "EUR",
    stock: typeof r.stock === "number" ? r.stock : null,
    imageSrc: imagePath ? resolveTrustedAssetUrl(imagePath) ?? null : null,
    gallery: resolveGallery(r.galleryImagePaths),
    whatThisTestCovers: readStringArray(r.whatThisTestCovers),
    whyGetTested: readStringArray(r.whyGetTested),
    extraSections: readExtraSections(r.extraSections),
    faqs: readHealthTestFaqs(r.faqs),
  };
});

function readHealthTestFaqs(raw: unknown): HealthTestFaqItem[] {
  if (!Array.isArray(raw)) return [];
  const out: HealthTestFaqItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const i = item as Record<string, unknown>;
    if (typeof i.id !== "string" || typeof i.question !== "string" || typeof i.answer !== "string") continue;
    out.push({ id: i.id, question: i.question, answer: i.answer });
  }
  return out;
}

// Subscription plan cards moved to `lib/content/get-country-plans.ts` (Sprint 3)
// against the Wave-0 PricingPlan shape (monthlyPriceCents / billingInterval /
// per-rule unlockAfterPaidMonths). The legacy reader here targeted the old
// pre-rename columns and a `/plans` route that never shipped — removed.
