/**
 * Review-gated Czech SEO copy for eligible existing service variants.
 *
 * Dry run, one exact asset at a time:
 *   node --env-file=.env --import tsx scripts/patch-czechia-seo-service-drafts.ts --only=neschopenka-online
 *   node --env-file=.env --import tsx scripts/patch-czechia-seo-service-drafts.ts --only=lekar-online-praha --locale=EN
 * Authorized apply, after clinical review:
 *   node --env-file=.env --import tsx scripts/patch-czechia-seo-service-drafts.ts --only=neschopenka-online --apply --approved-sha256=<hash> --reviewed-at=YYYY-MM-DD --reviewer-doctor-id=<id> --confirm=<token>
 * English apply also requires --native-reviewer-id=<id> and --native-reviewed-at=YYYY-MM-DD.
 *
 * Applying requires separate owner authorization plus the exact clinical
 * approval hash, reviewer, review date and confirmation token printed by the
 * dry run. The script never changes slugs, price, duration, booking settings,
 * doctor assignments, visibility or publication state.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Prisma } from "@prisma/client";

import {
  CZECHIA_SEO_SERVICE_DRAFTS,
  assertCzechiaSeoApplyGate,
  czechiaSeoApprovalSha256,
  czechiaSeoConfirmationToken,
  parseCzechiaSeoNativeReviewDate,
  parseCzechiaSeoReviewDate,
  type CzechiaSeoServiceDraft,
  validateCzechiaSeoServiceDraft,
} from "../src/content/czechia-seo-service-drafts.js";
import { disconnectDb, prisma } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";
import {
  assertCzechiaClinicalApproval,
  readCzechiaClinicalReviewRecord,
} from "./lib/czechia-clinical-approval.js";

function arg(name: string): string | null {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

export const serviceSelect = {
  id: true,
  countryId: true,
  kind: true,
  slug: true,
  visibility: true,
  isActive: true,
  updatedAt: true,
  name: true,
  summary: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  heroTitle: true,
  heroDescription: true,
  detailBody: true,
  ctaLabel: true,
  sortOrder: true,
  durationMinutes: true,
  basePriceCents: true,
  currencyCode: true,
  shippingCents: true,
  bookingPausedFrom: true,
  bookingPausedUntil: true,
  bookingPauseReason: true,
  consultationSetting: true,
  bookingSetting: true,
  lastReviewedAt: true,
  authorDisplayName: true,
  reviewerDisplayName: true,
  authorDoctorId: true,
  reviewerDoctorId: true,
  country: { select: { code: true, defaultLocale: true } },
  translations: {
    orderBy: { locale: "asc" },
    select: {
      id: true,
      locale: true,
      name: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      heroTitle: true,
      heroDescription: true,
      detailBody: true,
      ctaLabel: true,
      updatedAt: true,
    },
  },
  faqs: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      question: true,
      answer: true,
      sortOrder: true,
      isVisible: true,
      updatedAt: true,
      translations: {
        orderBy: { locale: "asc" },
        select: { id: true, locale: true, question: true, answer: true, updatedAt: true },
      },
    },
  },
  assignedDoctors: {
    orderBy: { doctorId: "asc" },
    select: {
      doctorId: true,
      isActive: true,
      status: true,
      sortOrder: true,
      doctorAmountCents: true,
    },
  },
} satisfies Prisma.ServiceSelect;

type ServiceSnapshot = Prisma.ServiceGetPayload<{ select: typeof serviceSelect }>;
type ServiceReader = Pick<Prisma.TransactionClient, "service">;
type PatcherClient = Pick<typeof prisma, "service" | "$transaction">;

export type CzechiaSeoPatchOptions = {
  only: string | null;
  locale?: string | null;
  apply: boolean;
  approvedHash: string | null;
  reviewedAt: Date | null;
  reviewerDoctorId: string | null;
  confirmation: string | null;
  clinicalReviewStatus: string | null;
  nativeReviewerId: string | null;
  nativeReviewedAt: Date | null;
};

export function clinicalReviewAsset(draft: CzechiaSeoServiceDraft): string {
  return `/czechia/${draft.locale.toLowerCase()}/services/${draft.slug}`;
}

export function clinicalReviewStatusFromRegister(csv: string, asset: string): string | null {
  return readCzechiaClinicalReviewRecord(csv, asset).status || null;
}

export function sourceSha256(service: ServiceSnapshot): string {
  return createHash("sha256").update(JSON.stringify(service)).digest("hex");
}

function protectedState(service: ServiceSnapshot): string {
  return JSON.stringify({
    slug: service.slug,
    kind: service.kind,
    visibility: service.visibility,
    isActive: service.isActive,
    sortOrder: service.sortOrder,
    durationMinutes: service.durationMinutes,
    basePriceCents: service.basePriceCents,
    currencyCode: service.currencyCode,
    shippingCents: service.shippingCents,
    bookingPausedFrom: service.bookingPausedFrom,
    bookingPausedUntil: service.bookingPausedUntil,
    bookingPauseReason: service.bookingPauseReason,
    consultationSetting: service.consultationSetting,
    bookingSetting: service.bookingSetting,
    lastReviewedAt: service.lastReviewedAt,
    authorDisplayName: service.authorDisplayName,
    reviewerDisplayName: service.reviewerDisplayName,
    authorDoctorId: service.authorDoctorId,
    reviewerDoctorId: service.reviewerDoctorId,
    assignedDoctors: service.assignedDoctors,
  });
}

const copyFields = [
  "name",
  "summary",
  "seoTitle",
  "seoDescription",
  "heroTitle",
  "heroDescription",
  "detailBody",
  "ctaLabel",
] as const;

type CopyField = (typeof copyFields)[number];

export const CZECHIA_PUBLIC_SERVICE_LOCALES = ["CS", "EN", "PT", "ES", "RO", "DE"] as const;

function draftCopy(draft: CzechiaSeoServiceDraft): Partial<Record<CopyField, string>> {
  return Object.fromEntries(
    copyFields.flatMap((field) =>
      draft[field] === undefined ? [] : [[field, draft[field]]],
    ),
  );
}

function nonCzechFallbackPlan(service: ServiceSnapshot, draft: CzechiaSeoServiceDraft) {
  const materializations: Array<{
    id: string;
    locale: string;
    data: Partial<Record<CopyField, string>>;
  }> = [];
  const localeOnlyFields = new Set<CopyField>();
  if (service.country.defaultLocale !== draft.locale) {
    return { materializations, localeOnlyFields };
  }
  const changedFields = copyFields.filter((field) => draft[field] !== undefined);
  for (const translation of service.translations) {
    if (translation.locale === draft.locale) continue;
    const data: Partial<Record<CopyField, string>> = {};
    for (const field of changedFields) {
      if (translation[field] !== null) continue;
      const currentFallback = service[field];
      if (currentFallback === null) localeOnlyFields.add(field);
      else data[field] = currentFallback;
    }
    if (Object.keys(data).length > 0) materializations.push({ id: translation.id, locale: translation.locale, data });
  }
  return { materializations, localeOnlyFields };
}

function incompleteNonCzechServiceLocales(
  service: ServiceSnapshot,
  draft: CzechiaSeoServiceDraft,
): string[] {
  if (service.country.defaultLocale !== draft.locale) return [];
  return CZECHIA_PUBLIC_SERVICE_LOCALES.filter(
    (locale) =>
      locale !== draft.locale &&
      service.translations.filter((translation) => translation.locale === locale).length !== 1,
  );
}

function nonCzechFaqFallbacks(service: ServiceSnapshot, draft: CzechiaSeoServiceDraft): string[] {
  if (draft.faqs.length === 0 || service.country.defaultLocale !== draft.locale) return [];
  const locales = CZECHIA_PUBLIC_SERVICE_LOCALES.filter((locale) => locale !== draft.locale);
  return service.faqs.flatMap((faq) =>
    locales
      .filter((locale) => !faq.translations.some((translation) => translation.locale === locale))
      .map((locale) => `${faq.id}:${locale}`),
  );
}

async function readService(client: ServiceReader, draft: CzechiaSeoServiceDraft) {
  return client.service.findUnique({ where: { id: draft.serviceId }, select: serviceSelect });
}

function assertExpectedSource(
  service: ServiceSnapshot,
  draft: CzechiaSeoServiceDraft,
  apply: boolean,
): string {
  if (service.slug !== draft.slug || service.country.code !== draft.countryCode) {
    throw new Error(`Refusing to continue: ${draft.slug} identity does not match production`);
  }
  if (service.kind !== "GENERAL" || service.visibility !== "PUBLIC" || !service.isActive) {
    throw new Error(`Refusing to continue: ${draft.slug} is not an active public GENERAL service`);
  }
  const czechTranslations = service.translations.filter(({ locale }) => locale === draft.locale);
  if (czechTranslations.length !== 1) {
    throw new Error(`Refusing to continue: ${draft.slug} does not have one ${draft.locale} translation`);
  }
  if (service.updatedAt.toISOString() !== draft.expectedServiceUpdatedAt) {
    throw new Error(`Refusing to continue: ${draft.slug} service updatedAt changed`);
  }
  const expectedFaqIds = [...draft.expectedFaqIds].sort();
  const actualFaqIds = service.faqs.map(({ id }) => id).sort();
  if (JSON.stringify(actualFaqIds) !== JSON.stringify(expectedFaqIds)) {
    throw new Error(`Refusing to continue: ${draft.slug} FAQ set changed`);
  }

  const currentHash = sourceSha256(service);
  if (draft.expectedSourceSha256 !== "PENDING_DRY_RUN" && currentHash !== draft.expectedSourceSha256) {
    throw new Error(`Refusing to continue: ${draft.slug} source fingerprint changed`);
  }
  if (apply && draft.expectedSourceSha256 === "PENDING_DRY_RUN") {
    throw new Error("Refusing to apply until the inspected source fingerprint is pinned");
  }
  return currentHash;
}

function preparedDraft(draft: CzechiaSeoServiceDraft): CzechiaSeoServiceDraft {
  const validationErrors = validateCzechiaSeoServiceDraft(draft);
  if (validationErrors.length > 0) {
    throw new Error(`${draft.slug} failed validation:\n- ${validationErrors.join("\n- ")}`);
  }
  const sanitizedBody = draft.detailBody ? sanitizeRichHtml(draft.detailBody) : null;
  if (draft.detailBody && (!sanitizedBody || sanitizedBody !== draft.detailBody)) {
    throw new Error(`${draft.slug} rich-text sanitizer changed the reviewed body`);
  }
  return draft;
}

function assertSavedCopy(
  service: ServiceSnapshot,
  before: ServiceSnapshot,
  draft: CzechiaSeoServiceDraft,
  localeOnlyFields: ReadonlySet<CopyField>,
): void {
  const translation = service.translations.find(({ locale }) => locale === draft.locale);
  if (!translation) throw new Error(`Verification failed: ${draft.slug} CS translation missing`);
  const expected = draftCopy(draft);
  if (copyFields.some((field) => expected[field] !== undefined && translation[field] !== expected[field])) {
    throw new Error(`Verification failed: ${draft.slug} display copy does not match`);
  }
  for (const field of copyFields) {
    const expectedValue = expected[field];
    if (expectedValue === undefined) continue;
    if (service.country.defaultLocale === draft.locale && !localeOnlyFields.has(field)) {
      if (service[field] !== expectedValue) {
        throw new Error(`Verification failed: ${draft.slug} default-locale base ${field} does not match`);
      }
    } else if (service[field] !== before[field]) {
      throw new Error(`Verification failed: ${draft.slug} unrelated base ${field} changed`);
    }
  }
  for (const faqDraft of draft.faqs) {
    const faq = service.faqs.find(({ id }) => id === faqDraft.id);
    const translated = faq?.translations.find(({ locale }) => locale === draft.locale);
    if (
      faq?.question !== faqDraft.question ||
      faq.answer !== faqDraft.answer ||
      (translated &&
        (translated.question !== faqDraft.question || translated.answer !== faqDraft.answer))
    ) {
      throw new Error(`Verification failed: ${draft.slug} FAQ ${faqDraft.id} does not match`);
    }
  }
}

export async function runCzechiaSeoServicePatch(
  client: PatcherClient,
  options: CzechiaSeoPatchOptions,
  logger: Pick<Console, "log"> = console,
  drafts: readonly CzechiaSeoServiceDraft[] = CZECHIA_SEO_SERVICE_DRAFTS,
) {
  if (!options.only) throw new Error("Pass exactly one --only=<service-slug>");
  const matches = drafts.filter(
    ({ slug, locale }) => slug === options.only && (!options.locale || locale === options.locale.toUpperCase()),
  );
  if (matches.length > 1) throw new Error(`Pass --locale=CS or --locale=EN for ${options.only}`);
  const draft = matches[0];
  if (!draft) throw new Error(`Unsupported --only=${options.only}${options.locale ? ` --locale=${options.locale}` : ""}`);
  const prepared = preparedDraft(draft);
  const approvalHash = czechiaSeoApprovalSha256(prepared);
  assertCzechiaSeoApplyGate(
    options.apply,
    prepared,
    options.reviewedAt,
    options.approvedHash,
    options.reviewerDoctorId,
    options.confirmation,
    options.clinicalReviewStatus,
    options.nativeReviewerId,
    options.nativeReviewedAt,
  );

  const existing = await readService(client, prepared);
  if (!existing) throw new Error(`Service ${prepared.serviceId} not found`);
  const currentSourceSha256 = assertExpectedSource(existing, prepared, options.apply);

  logger.log(`${options.apply ? "APPLY" : "DRY RUN"}: ${prepared.slug}`);
  logger.log(`  record: ${existing.id}; locale: ${prepared.locale}`);
  logger.log(`  source sha256: ${currentSourceSha256}`);
  logger.log(`  approval sha256: ${approvalHash}`);
  logger.log(`  confirmation: ${czechiaSeoConfirmationToken(prepared)}`);
  logger.log(`  SEO title (${prepared.seoTitle.length}): ${prepared.seoTitle}`);
  logger.log(`  meta (${prepared.seoDescription.length}): ${prepared.seoDescription}`);
  logger.log(`  H1: ${prepared.heroTitle}`);
  logger.log(`  FAQs preserved/updated in place: ${prepared.faqs.length}`);
  logger.log(`  price/duration/doctors/booking preserved: yes`);

  const fallbackPlan = nonCzechFallbackPlan(existing, prepared);
  const incompleteServiceLocales = incompleteNonCzechServiceLocales(existing, prepared);
  const faqFallbackBlockers = nonCzechFaqFallbacks(existing, prepared);
  if (fallbackPlan.materializations.length > 0) {
    logger.log(
      `  preserved non-CS fallbacks: ${fallbackPlan.materializations.map(({ locale }) => locale).join(", ")}`,
    );
  }
  if (fallbackPlan.localeOnlyFields.size > 0) {
    logger.log(`  locale-only base fields: ${[...fallbackPlan.localeOnlyFields].join(", ")}`);
  }
  if (incompleteServiceLocales.length > 0) {
    logger.log(`  apply blocker: missing non-CS service translation rows (${incompleteServiceLocales.join(", ")})`);
  }
  if (incompleteServiceLocales.length > 0) {
    throw new Error(
      `Refusing to apply: ${prepared.slug} missing non-CS service translation rows: ${incompleteServiceLocales.join(", ")}`,
    );
  }
  if (faqFallbackBlockers.length > 0) {
    logger.log(`  apply blocker: missing non-CS FAQ translations (${faqFallbackBlockers.join("; ")})`);
  }

  if (!options.apply) {
    logger.log("Dry run only. Clinical approval and separate owner authorization are still required.");
    return existing;
  }
  if (faqFallbackBlockers.length > 0) {
    throw new Error(`Refusing to apply: ${prepared.slug} has unsafe non-CS base-copy fallbacks`);
  }

  const updated = await client.$transaction(async (tx) => {
    const locked = await readService(tx, prepared);
    if (!locked) throw new Error(`Service ${prepared.serviceId} disappeared`);
    const lockedSourceSha256 = assertExpectedSource(locked, prepared, options.apply);
    if (lockedSourceSha256 !== currentSourceSha256) {
      throw new Error(`Refusing to apply: ${prepared.slug} changed after the dry-run read`);
    }
    const beforeProtectedState = protectedState(locked);
    const lockedFallbackPlan = nonCzechFallbackPlan(locked, prepared);
    const lockedIncompleteServiceLocales = incompleteNonCzechServiceLocales(locked, prepared);
    const lockedFaqFallbacks = nonCzechFaqFallbacks(locked, prepared);
    if (lockedIncompleteServiceLocales.length > 0) {
      throw new Error(
        `Refusing to apply: ${prepared.slug} missing non-CS service translation rows: ${lockedIncompleteServiceLocales.join(", ")}`,
      );
    }
    if (lockedFaqFallbacks.length > 0) {
      throw new Error(`Refusing to apply: ${prepared.slug} has an unsafe non-CS base fallback`);
    }

    const reviewer = await tx.doctor.findUnique({
      where: { id: options.reviewerDoctorId! },
      select: {
        active: true,
        additionalCountries: {
          where: { countryId: locked.countryId, active: true },
          select: {
            chamberEntity: true,
            registrationNumber: true,
            isVerified: true,
          },
        },
      },
    });
    const registration = reviewer?.additionalCountries[0];
    if (
      !reviewer?.active ||
      !registration?.isVerified ||
      registration.chamberEntity !== "ČLK" ||
      !registration.registrationNumber
    ) {
      throw new Error("Refusing to apply: reviewer must have a verified active Czech ČLK registration");
    }

    // Review fields live on Service, so changing them would attribute this CS-only
    // approval to every locale. The external review record gates the copy; global
    // reviewer metadata stays unchanged until the schema supports locale scope.

    // Materialize the exact value each non-CS locale already receives from the
    // base row before changing that Czech base row. This changes storage only;
    // the rendered non-CS copy remains byte-for-byte identical.
    for (const fallback of lockedFallbackPlan.materializations) {
      await tx.serviceTranslation.update({ where: { id: fallback.id }, data: fallback.data });
    }

    const desiredCopy = draftCopy(prepared);
    const baseCopy = Object.fromEntries(
      Object.entries(desiredCopy).filter(([field]) =>
        locked.country.defaultLocale === prepared.locale && !lockedFallbackPlan.localeOnlyFields.has(field as CopyField),
      ),
    );
    if (Object.keys(baseCopy).length > 0) {
      const serviceUpdate = await tx.service.updateMany({
        where: { id: prepared.serviceId, updatedAt: locked.updatedAt },
        data: baseCopy,
      });
      if (serviceUpdate.count !== 1) throw new Error("Refusing to apply: service concurrency guard failed");
    }

    const translation = locked.translations.find(({ locale }) => locale === prepared.locale)!;
    const translationUpdate = await tx.serviceTranslation.updateMany({
      where: { id: translation.id, updatedAt: translation.updatedAt },
      data: desiredCopy,
    });
    if (translationUpdate.count !== 1) {
      throw new Error("Refusing to apply: service translation concurrency guard failed");
    }

    for (const faqDraft of prepared.faqs) {
      const faq = locked.faqs.find(({ id }) => id === faqDraft.id)!;
      const translationRow = faq.translations.find(({ locale }) => locale === prepared.locale);
      await tx.serviceFaq.update({
        where: { id: faq.id },
        data: { question: faqDraft.question, answer: faqDraft.answer },
      });
      if (translationRow) {
        await tx.serviceFaqTranslation.update({
          where: { id: translationRow.id },
          data: { question: faqDraft.question, answer: faqDraft.answer },
        });
      }
    }

    const saved = await readService(tx, prepared);
    if (!saved) throw new Error(`Verification failed: ${prepared.slug} disappeared`);
    assertSavedCopy(saved, locked, prepared, lockedFallbackPlan.localeOnlyFields);
    if (protectedState(saved) !== beforeProtectedState) {
      throw new Error(`Verification failed: ${prepared.slug} protected operational state changed`);
    }
    return saved;
  }, { isolationLevel: "Serializable", timeout: 30_000 });

  logger.log(`VERIFIED: ${updated.slug} review-gated CS copy saved; global review metadata preserved.`);
  return updated;
}

async function main() {
  const only = arg("only");
  const locale = arg("locale");
  const draft = CZECHIA_SEO_SERVICE_DRAFTS.find(
    (entry) => entry.slug === only && (!locale || entry.locale === locale.toUpperCase()),
  );
  const repoRoot = process.cwd().endsWith("backend") ? resolve(process.cwd(), "..") : process.cwd();
  const register = readFileSync(resolve(repoRoot, "seo/czechia/clinical-review-register.csv"), "utf8");
  const apply = process.argv.includes("--apply");
  if (apply && draft) {
    const approval = assertCzechiaClinicalApproval(register, {
      asset: clinicalReviewAsset(draft),
      approvedSha256: czechiaSeoApprovalSha256(draft),
    });
    if (approval.reviewer_doctor_id !== arg("reviewer-doctor-id")) {
      throw new Error("Refusing to apply: reviewer doctor ID does not match the recorded approval");
    }
    if (approval.reviewed_at.slice(0, 10) !== arg("reviewed-at")) {
      throw new Error("Refusing to apply: review date does not match the recorded approval");
    }
    if (draft.locale === "EN" && approval.native_reviewer_id !== arg("native-reviewer-id")) {
      throw new Error("Refusing to apply: native reviewer ID does not match the recorded approval");
    }
    if (draft.locale === "EN" && approval.native_reviewed_at.slice(0, 10) !== arg("native-reviewed-at")) {
      throw new Error("Refusing to apply: native review date does not match the recorded approval");
    }
  }
  await runCzechiaSeoServicePatch(prisma, {
    only,
    locale,
    apply,
    approvedHash: arg("approved-sha256"),
    reviewedAt: parseCzechiaSeoReviewDate(arg("reviewed-at") ?? undefined),
    reviewerDoctorId: arg("reviewer-doctor-id"),
    confirmation: arg("confirm"),
    clinicalReviewStatus: draft
      ? clinicalReviewStatusFromRegister(register, clinicalReviewAsset(draft))
      : null,
    nativeReviewerId: arg("native-reviewer-id"),
    nativeReviewedAt: parseCzechiaSeoNativeReviewDate(arg("native-reviewed-at") ?? undefined),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(disconnectDb);
}
