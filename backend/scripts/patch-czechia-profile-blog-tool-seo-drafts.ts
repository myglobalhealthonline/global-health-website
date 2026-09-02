/**
 * Preview one Czech doctor-profile, diabetes-blog or tool metadata draft.
 * Doctor metadata and blog apply are possible only after the relevant approval
 * is recorded in the clinical register:
 *
 * node --env-file=.env --import tsx scripts/patch-czechia-profile-blog-tool-seo-drafts.ts --only=doctor:dr-ahmed-maklad
 * node --env-file=.env --import tsx scripts/patch-czechia-profile-blog-tool-seo-drafts.ts --only=doctor:dr-ahmed-maklad --apply --approved-sha256=<hash> --reviewed-at=YYYY-MM-DD --reviewer-doctor-id=<id> --confirm=<token>
 *
 * Doctor apply changes only the existing Czech CS market-translation SEO
 * fields. Doctor FAQs and all profile, credential and biography fields remain
 * untouched. Tool drafts remain preview-only because Czech tool JSON is shared.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma } from "@prisma/client";

import {
  CZECHIA_BLOG_SEO_DRAFTS,
  CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS,
  CZECHIA_TOOL_SEO_DRAFTS,
  assertCzechiaBlogMetadataReadback,
  assertCzechiaClinicalPromotionGate,
  assertCzechiaDoctorMetadataReadback,
  czechiaClinicalDraftApprovalSha256,
  czechiaClinicalDraftConfirmationToken,
  findCzechiaClinicalRegisterRow,
  type CzechiaBlogSeoDraft,
  type CzechiaDoctorProfileSeoDraft,
  type CzechiaProfileBlogToolDraft,
  type CzechiaToolSeoDraft,
} from "../src/content/czechia-profile-blog-tool-seo-drafts.js";
import { disconnectDb, prisma } from "../src/db/prisma.js";
import { assertCzechiaClinicalApproval } from "./lib/czechia-clinical-approval.js";

const doctorSourceSelect = {
  id: true,
  doctorId: true,
  countryId: true,
  country: { select: { code: true } },
  sortOrder: true,
  active: true,
  chamberEntity: true,
  registrationNumber: true,
  registrationUrl: true,
  division: true,
  isVerified: true,
  verifiedAt: true,
  directorAccess: true,
  createdAt: true,
  doctor: {
    select: {
      id: true,
      countryId: true,
      slug: true,
      fullName: true,
      title: true,
      bio: true,
      seoTitle: true,
      seoDescription: true,
      lastReviewedAt: true,
      medicalRegistrationUrl: true,
      qualifications: true,
      languages: true,
      active: true,
      bookingPausedFrom: true,
      bookingPausedUntil: true,
      bookingPauseReason: true,
      updatedAt: true,
      createdAt: true,
      credentials: {
        orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
        select: {
          id: true,
          countryCode: true,
          label: true,
          bodyName: true,
          bodyUrl: true,
          sortOrder: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      specialties: {
        orderBy: { specialtyId: "asc" as const },
        select: { id: true, specialtyId: true },
      },
      assignedServices: {
        orderBy: [{ serviceId: "asc" as const }, { id: "asc" as const }],
        select: {
          id: true,
          serviceId: true,
          isActive: true,
          sortOrder: true,
          selectedBy: true,
          status: true,
          doctorAmountCents: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      availabilities: {
        orderBy: [
          { weekday: "asc" as const },
          { startMinute: "asc" as const },
          { id: "asc" as const },
        ],
        select: {
          id: true,
          weekday: true,
          startMinute: true,
          endMinute: true,
          slotDurationMinutes: true,
          effectiveFrom: true,
          effectiveUntil: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      faqs: {
        where: { locale: "CS" as const, isActive: true },
        orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
        select: {
          id: true,
          locale: true,
          question: true,
          answer: true,
          sortOrder: true,
          isActive: true,
          updatedAt: true,
        },
      },
    },
  },
  translations: {
    where: { locale: "CS" as const },
    select: {
      id: true,
      locale: true,
      title: true,
      bio: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.DoctorCountrySelect;

const blogSourceSelect = {
  id: true,
  countryId: true,
  slug: true,
  title: true,
  excerpt: true,
  body: true,
  status: true,
  locale: true,
  category: true,
  authorDisplayName: true,
  reviewerDisplayName: true,
  seoTitle: true,
  seoDescription: true,
  isActive: true,
  updatedAt: true,
  authorDoctorId: true,
  reviewerDoctorId: true,
  ctaServiceId: true,
  coverAssetId: true,
  publishedAt: true,
  lastReviewedAt: true,
  editorialChecklist: true,
  createdAt: true,
  countries: { select: { country: { select: { code: true } } } },
  translations: {
    orderBy: { locale: "asc" as const },
    select: {
      id: true,
      locale: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      seoTitle: true,
      seoDesc: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.BlogPostSelect;

type DoctorSource = Prisma.DoctorCountryGetPayload<{ select: typeof doctorSourceSelect }>;
type BlogSource = Prisma.BlogPostGetPayload<{ select: typeof blogSourceSelect }>;
type DatabaseClient = typeof prisma;

export type CzechiaProfileBlogToolPatchOptions = Readonly<{
  only: string;
  apply: boolean;
  approvedHash: string | null;
  reviewedAt: Date | null;
  reviewerDoctorId: string | null;
  confirmation: string | null;
}>;

export function czechiaProfileBlogToolSourceSha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

type CountryCode = Readonly<{ code: string }>;
type BlogCountryMapping = Readonly<{ country: CountryCode }>;

export function assertCzechiaDoctorCountryCode(country: CountryCode): void {
  if (country.code.trim().toLowerCase() !== "cz") {
    throw new Error("Refusing to apply: doctor market must belong exclusively to Czechia");
  }
}

export function assertActiveGovernanceReviewer(
  reviewer: Readonly<{ active: boolean }> | null,
): void {
  if (!reviewer?.active) {
    throw new Error(
      "Refusing to apply: reviewer must be an active doctor delegated for governance review",
    );
  }
}

export function assertExclusiveCzechiaBlogCountries(
  countries: readonly BlogCountryMapping[],
): void {
  if (
    countries.length !== 1 ||
    countries[0]?.country.code.trim().toLowerCase() !== "cz"
  ) {
    throw new Error("Refusing to apply: blog must be mapped exclusively to Czechia");
  }
}

function key(draft: CzechiaProfileBlogToolDraft): string {
  return `${draft.assetKind}:${draft.slug}`;
}

function assertSourceHash(draft: CzechiaProfileBlogToolDraft, source: unknown): void {
  // Country identity is a separate transactional security guard. It was added
  // after the immutable doctor source fingerprints were approved, so exclude
  // only that newly selected relation from the legacy fingerprint payload.
  const fingerprintSource =
    draft.assetKind === "doctor" && source !== null && typeof source === "object"
      ? (({ country: _countryGuard, ...existingSource }) => existingSource)(
          source as Record<string, unknown>,
        )
      : source;
  const actual = czechiaProfileBlogToolSourceSha256(fingerprintSource);
  if (actual !== draft.expectedSourceSha256) {
    throw new Error(
      `${draft.assetPath} source fingerprint changed: expected ${draft.expectedSourceSha256}, received ${actual}`,
    );
  }
}

function parseReviewDate(value: string | null): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Review date must use YYYY-MM-DD");
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Review date must be a valid calendar date");
  }
  return parsed;
}

async function loadDoctorSource(
  client: Pick<DatabaseClient, "doctorCountry"> | Prisma.TransactionClient,
  draft: CzechiaDoctorProfileSeoDraft,
): Promise<DoctorSource> {
  const source = await client.doctorCountry.findUnique({
    where: { id: draft.doctorCountryId },
    select: doctorSourceSelect,
  });
  if (!source) throw new Error(`Missing Czech doctor market ${draft.slug}`);
  assertCzechiaDoctorCountryCode(source.country);
  const translation = source.translations[0];
  if (
    !source.active ||
    !source.doctor.active ||
    source.doctor.id !== draft.doctorId ||
    source.doctor.slug !== draft.slug ||
    source.translations.length !== 1 ||
    translation?.id !== draft.translationId ||
    translation.locale !== "CS" ||
    translation.updatedAt.toISOString() !== draft.expectedTranslationUpdatedAt
  ) {
    throw new Error(`${draft.assetPath} identity, locale, activity or updatedAt guard failed`);
  }
  return source;
}

async function loadBlogSource(
  client: Pick<DatabaseClient, "blogPost"> | Prisma.TransactionClient,
  draft: CzechiaBlogSeoDraft,
): Promise<BlogSource> {
  const source = await client.blogPost.findUnique({
    where: { id: draft.postId },
    select: blogSourceSelect,
  });
  if (!source) throw new Error(`Missing Czech diabetes blog ${draft.slug}`);
  assertExclusiveCzechiaBlogCountries(source.countries);
  if (
    source.slug !== draft.slug ||
    source.locale !== "CS" ||
    source.status !== "PUBLISHED" ||
    !source.isActive ||
    source.updatedAt.toISOString() !== draft.expectedPostUpdatedAt
  ) {
    throw new Error(`${draft.assetPath} identity, country, publication or updatedAt guard failed`);
  }
  return source;
}

async function assertEligibleCzechReviewer(
  client: Prisma.TransactionClient,
  reviewerDoctorId: string,
): Promise<void> {
  const reviewer = await client.doctor.findUnique({
    where: { id: reviewerDoctorId },
    select: {
      active: true,
      additionalCountries: {
        where: {
          active: true,
          isVerified: true,
          country: { code: "cz" },
        },
        select: { chamberEntity: true, registrationNumber: true, isVerified: true },
      },
    },
  });
  const registration = reviewer?.additionalCountries[0];
  if (
    !reviewer?.active ||
    !registration?.isVerified ||
    registration.chamberEntity?.trim().toLocaleUpperCase("cs-CZ") !== "ČLK" ||
    !registration.registrationNumber?.trim()
  ) {
    throw new Error("Refusing to apply: reviewer must have a verified active Czech ČLK registration");
  }
}

async function assertEligibleActiveGovernanceReviewer(
  client: Prisma.TransactionClient,
  reviewerDoctorId: string,
): Promise<void> {
  const reviewer = await client.doctor.findUnique({
    where: { id: reviewerDoctorId },
    select: { active: true },
  });
  assertActiveGovernanceReviewer(reviewer);
}

function protectedDoctorState(source: DoctorSource): string {
  return JSON.stringify({
    ...source,
    translations: source.translations.map(
      ({
        seoTitle: _seoTitle,
        seoDescription: _seoDescription,
        seoKeywords: _seoKeywords,
        updatedAt: _updatedAt,
        ...translation
      }) => translation,
    ),
  });
}

async function applyDoctor(
  draft: CzechiaDoctorProfileSeoDraft,
  options: CzechiaProfileBlogToolPatchOptions,
): Promise<void> {
  await prisma.$transaction(
    async (transaction) => {
      await assertEligibleActiveGovernanceReviewer(transaction, options.reviewerDoctorId!);
      const before = await loadDoctorSource(transaction, draft);
      assertSourceHash(draft, before);
      const protectedBefore = protectedDoctorState(before);
      const result = await transaction.doctorMarketTranslation.updateMany({
        where: {
          id: draft.translationId,
          doctorCountryId: draft.doctorCountryId,
          locale: "CS",
          updatedAt: new Date(draft.expectedTranslationUpdatedAt),
        },
        data: {
          seoTitle: draft.desired.seoTitle,
          seoDescription: draft.desired.seoDescription,
          seoKeywords: [...draft.desired.seoKeywords],
        },
      });
      if (result.count !== 1) throw new Error(`${draft.assetPath} changed after preview`);
      const saved = await transaction.doctorCountry.findUniqueOrThrow({
        where: { id: draft.doctorCountryId },
        select: doctorSourceSelect,
      });
      assertCzechiaDoctorCountryCode(saved.country);
      if (protectedDoctorState(saved) !== protectedBefore) {
        throw new Error(
          `${draft.assetPath} protected profile, credential, biography or FAQ state changed`,
        );
      }
      assertCzechiaDoctorMetadataReadback(draft, saved.translations[0]);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 45_000,
    },
  );
}

function protectedBlogState(source: BlogSource): string {
  return JSON.stringify({
    id: source.id,
    countryId: source.countryId,
    slug: source.slug,
    excerpt: source.excerpt,
    body: source.body,
    status: source.status,
    locale: source.locale,
    category: source.category,
    authorDisplayName: source.authorDisplayName,
    reviewerDisplayName: source.reviewerDisplayName,
    authorDoctorId: source.authorDoctorId,
    reviewerDoctorId: source.reviewerDoctorId,
    ctaServiceId: source.ctaServiceId,
    coverAssetId: source.coverAssetId,
    publishedAt: source.publishedAt,
    lastReviewedAt: source.lastReviewedAt,
    editorialChecklist: source.editorialChecklist,
    isActive: source.isActive,
    createdAt: source.createdAt,
    translations: source.translations,
    countries: source.countries,
  });
}

async function applyBlog(
  draft: CzechiaBlogSeoDraft,
  options: CzechiaProfileBlogToolPatchOptions,
): Promise<void> {
  await prisma.$transaction(
    async (transaction) => {
      await assertEligibleCzechReviewer(transaction, options.reviewerDoctorId!);
      const before = await loadBlogSource(transaction, draft);
      assertSourceHash(draft, before);
      const protectedBefore = protectedBlogState(before);
      const result = await transaction.blogPost.updateMany({
        where: {
          id: draft.postId,
          updatedAt: new Date(draft.expectedPostUpdatedAt),
          status: "PUBLISHED",
          isActive: true,
          locale: "CS",
        },
        data: draft.desired,
      });
      if (result.count !== 1) throw new Error(`${draft.assetPath} changed after preview`);
      const saved = await transaction.blogPost.findUniqueOrThrow({
        where: { id: draft.postId },
        select: blogSourceSelect,
      });
      if (protectedBlogState(saved) !== protectedBefore) {
        throw new Error(`${draft.assetPath} protected article body or attribution state changed`);
      }
      assertCzechiaBlogMetadataReadback(draft, saved);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 45_000 },
  );
}

function loadToolSource(draft: CzechiaToolSeoDraft): unknown {
  const file = resolve(import.meta.dirname, "../../frontend/locales/cs/tools.json");
  const json = JSON.parse(readFileSync(file, "utf8")) as { tools?: Record<string, unknown> };
  const source = json.tools?.[draft.slug];
  if (!source) throw new Error(`Missing Czech tool source ${draft.slug}`);
  return source;
}

export async function runCzechiaProfileBlogToolPatch(
  options: CzechiaProfileBlogToolPatchOptions,
  logger: Pick<Console, "log"> = console,
): Promise<void> {
  const drafts: readonly CzechiaProfileBlogToolDraft[] = [
    ...CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS,
    ...CZECHIA_BLOG_SEO_DRAFTS,
    ...CZECHIA_TOOL_SEO_DRAFTS,
  ];
  const draft = drafts.find((candidate) => key(candidate) === options.only);
  if (!draft) throw new Error(`Use --only=<kind>:<slug>; unknown target ${options.only}`);
  const register = readFileSync(
    resolve(import.meta.dirname, "../../seo/czechia/clinical-review-register.csv"),
    "utf8",
  );
  const registerRow = findCzechiaClinicalRegisterRow(register, draft.assetPath);

  if (options.apply) {
    const approval = assertCzechiaClinicalApproval(register, {
      asset: draft.assetPath,
      approvedSha256: czechiaClinicalDraftApprovalSha256(draft),
    });
    if (approval.reviewer_doctor_id !== options.reviewerDoctorId) {
      throw new Error("Refusing to apply: reviewer doctor ID does not match the recorded approval");
    }
    if (approval.reviewed_at.slice(0, 10) !== options.reviewedAt?.toISOString().slice(0, 10)) {
      throw new Error("Refusing to apply: review date does not match the recorded approval");
    }
  }

  assertCzechiaClinicalPromotionGate({
    apply: options.apply,
    draft,
    registerStatus: registerRow.status,
    reviewedAt: options.reviewedAt,
    reviewerId: options.reviewerDoctorId,
    approvedHash: options.approvedHash,
    confirmation: options.confirmation,
  });

  if (draft.assetKind === "doctor") {
    assertSourceHash(draft, await loadDoctorSource(prisma, draft));
  } else if (draft.assetKind === "blog") {
    assertSourceHash(draft, await loadBlogSource(prisma, draft));
  } else {
    assertSourceHash(draft, loadToolSource(draft));
  }

  logger.log(`${key(draft)} approval-sha256=${czechiaClinicalDraftApprovalSha256(draft)}`);
  logger.log(`${key(draft)} confirmation=${czechiaClinicalDraftConfirmationToken(draft)}`);
  logger.log(`${key(draft)} clinical-register=${registerRow.status || "missing"}`);

  if (!options.apply) {
    logger.log("DRY-RUN ONLY. No biography, credential, article body, global FAQ or shared tool runtime copy changed.");
    return;
  }
  if (draft.assetKind === "doctor") {
    await applyDoctor(draft, options);
    logger.log(
      `APPLIED ${key(draft)} Czech market metadata only; protected profile state verified unchanged.`,
    );
    return;
  }
  if (draft.assetKind === "tool") {
    throw new Error(
      "Tool promotion requires a reviewed cz/cs-only country-scoped frontend overlay; shared CS JSON will not be changed",
    );
  }
  await applyBlog(draft, options);
  logger.log(`APPLIED ${key(draft)} metadata only; protected content verified unchanged.`);
}

function arg(name: string): string | null {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

async function main(): Promise<void> {
  const only = arg("only");
  if (!only) throw new Error("--only=<kind>:<slug> is required");
  const drafts: readonly CzechiaProfileBlogToolDraft[] = [
    ...CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS,
    ...CZECHIA_BLOG_SEO_DRAFTS,
    ...CZECHIA_TOOL_SEO_DRAFTS,
  ];
  const draft = drafts.find((candidate) => key(candidate) === only);
  if (!draft) throw new Error(`Unknown target ${only}`);
  const apply = process.argv.includes("--apply");
  await runCzechiaProfileBlogToolPatch({
    only,
    apply,
    approvedHash: arg("approved-sha256"),
    reviewedAt: parseReviewDate(arg("reviewed-at")),
    reviewerDoctorId: arg("reviewer-doctor-id"),
    confirmation: arg("confirm"),
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(disconnectDb);
}
