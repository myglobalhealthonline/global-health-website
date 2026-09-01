/**
 * Dry-run or apply the three review-gated Czechia PageContent SEO drafts.
 *
 * Dry run:
 *   node --env-file=.env --import tsx scripts/patch-czechia-page-content-seo-drafts.ts --only=home-cs
 *
 * Apply remains impossible while the matching clinical-register row is pending.
 * After recorded approval, it additionally requires the exact copy hash, review
 * date, reviewer ID, source fingerprint and confirmation token printed here.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Prisma } from "@prisma/client";

import { parseCsv } from "./legacy-migration/lib/contacts-csv.js";
import {
  CZECHIA_PAGE_CONTENT_SEO_DRAFTS,
  assertCzechiaPageContentApplyGate,
  czechiaPageContentApprovalSha256,
  czechiaPageContentConfirmationToken,
  validateCzechiaPageContentSeoDraft,
  type CzechiaPageContentSeoDraft,
} from "../src/content/czechia-page-content-seo-drafts.js";
import { parseCzechiaSeoReviewDate } from "../src/content/czechia-seo-service-drafts.js";
import { disconnectDb, prisma } from "../src/db/prisma.js";
import { assertCzechiaClinicalApproval } from "./lib/czechia-clinical-approval.js";

const CLINICAL_REGISTER_PATH = fileURLToPath(
  new URL("../../seo/czechia/clinical-review-register.csv", import.meta.url),
);

const translationSelect = {
  id: true,
  pageContentId: true,
  locale: true,
  heroTitle: true,
  heroSubtitle: true,
  heroTitleLead: true,
  heroTitleAccent: true,
  ctaLabel: true,
  intro: true,
  whoForTitle: true,
  whoForIntro: true,
  whoForItems: true,
  whyChooseTitle: true,
  whyChooseItems: true,
  faq: true,
  disclaimerParagraphs: true,
  disclaimerShort: true,
  body: true,
  seoTitle: true,
  seoDescription: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PageContentTranslationSelect;

const pageSelect = {
  id: true,
  country: { select: { code: true } },
  pageKey: true,
  status: true,
  isActive: true,
  updatedAt: true,
  heroImagePath: true,
  ogImagePath: true,
  ctaHref: true,
  showIntro: true,
  showWhoFor: true,
  showWhyChoose: true,
  showFaq: true,
  showDisclaimer: true,
  showBody: true,
  introTheme: true,
  whoForTheme: true,
  whyChooseTheme: true,
  faqTheme: true,
  disclaimerTheme: true,
  createdAt: true,
} satisfies Prisma.PageContentSelect;

type PageReader = Pick<Prisma.TransactionClient, "pageContent">;
type ReviewerReader = Pick<Prisma.TransactionClient, "doctor">;
type PatcherClient = Pick<typeof prisma, "pageContent" | "doctor" | "$transaction">;

export type CzechiaPageContentPatchOptions = Readonly<{
  only: string | null;
  apply: boolean;
  approvedHash: string | null;
  reviewedAt: Date | null;
  reviewerId: string | null;
  nativeReviewerId: string | null;
  nativeReviewedAt: Date | null;
  confirmation: string | null;
}>;

export const parseCzechiaPageContentReviewDate = parseCzechiaSeoReviewDate;

function arg(name: string): string | null {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

async function readPage(reader: PageReader, draft: CzechiaPageContentSeoDraft) {
  return reader.pageContent.findUnique({
    where: { id: draft.pageContentId },
    select: {
      ...pageSelect,
      translations: {
        where: { id: draft.translationId, locale: draft.locale },
        select: translationSelect,
      },
    },
  });
}

export function pageContentSourceSha256(page: unknown): string {
  const source =
    page && typeof page === "object" && !Array.isArray(page)
      ? (({ country: _country, ...rest }) => rest)(page as Record<string, unknown>)
      : page;
  return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}

export function readClinicalRegisterStatus(csv: string, asset: string): string {
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new Error("Clinical register is empty");
  const assetIndex = header.indexOf("asset");
  const statusIndex = header.indexOf("status");
  if (assetIndex < 0 || statusIndex < 0) {
    throw new Error("Clinical register must contain asset and status columns");
  }
  const row = rows.find((candidate) => candidate[assetIndex] === asset);
  if (!row) throw new Error(`Clinical register is missing ${asset}`);
  return row[statusIndex] ?? "";
}

function assertExactSource(
  page: NonNullable<Awaited<ReturnType<typeof readPage>>>,
  draft: CzechiaPageContentSeoDraft,
): void {
  if (page.country.code !== "cz") {
    throw new Error(`Refusing ${draft.key}: PageContent country changed`);
  }
  if (page.id !== draft.pageContentId || page.pageKey !== draft.pageKey) {
    throw new Error(`Refusing ${draft.key}: PageContent identity changed`);
  }
  if (page.status !== "PUBLISHED" || !page.isActive) {
    throw new Error(`Refusing ${draft.key}: page status=${page.status} isActive=${page.isActive}`);
  }
  if (page.updatedAt.toISOString() !== draft.expectedPageUpdatedAt) {
    throw new Error(`Refusing ${draft.key}: PageContent updatedAt changed`);
  }
  const translation = page.translations[0];
  if (!translation || translation.id !== draft.translationId || translation.locale !== draft.locale) {
    throw new Error(`Refusing ${draft.key}: exact ${draft.locale} translation is missing`);
  }
  if (translation.updatedAt.toISOString() !== draft.expectedTranslationUpdatedAt) {
    throw new Error(`Refusing ${draft.key}: translation updatedAt changed`);
  }
  const actualHash = pageContentSourceSha256(page);
  if (actualHash !== draft.expectedSourceSha256) {
    throw new Error(
      `Refusing ${draft.key}: source fingerprint changed; expected=${draft.expectedSourceSha256} actual=${actualHash}`,
    );
  }
}

function changedFields(
  translation: Record<string, unknown>,
  copy: CzechiaPageContentSeoDraft["copy"],
): string[] {
  return Object.entries(copy)
    .filter(([field, value]) => translation[field] !== value)
    .map(([field]) => field);
}

async function assertEligibleReviewer(reader: ReviewerReader, reviewerId: string): Promise<void> {
  const reviewer = await reader.doctor.findUnique({
    where: { id: reviewerId },
    select: {
      active: true,
      additionalCountries: {
        where: { active: true, country: { code: "cz" } },
        select: {
          active: true,
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
    !registration?.active ||
    !registration.isVerified ||
    registration.chamberEntity !== "ČLK" ||
    !registration.registrationNumber
  ) {
    throw new Error("Refusing to apply: reviewer must have a verified active Czech ČLK registration");
  }
}

function protectedState(
  page: NonNullable<Awaited<ReturnType<typeof readPage>>>,
  copy: CzechiaPageContentSeoDraft["copy"],
): string {
  const { translations, ...pageFields } = page;
  const translation = { ...translations[0] } as Record<string, unknown>;
  delete translation.updatedAt;
  for (const field of Object.keys(copy)) delete translation[field];
  return JSON.stringify({ page: pageFields, translation });
}

export async function runCzechiaPageContentSeoPatch(
  client: PatcherClient,
  options: CzechiaPageContentPatchOptions,
  clinicalRegisterCsv: string,
  logger: Pick<Console, "log"> = console,
  drafts: readonly CzechiaPageContentSeoDraft[] = CZECHIA_PAGE_CONTENT_SEO_DRAFTS,
): Promise<void> {
  const selected = options.only ? drafts.filter(({ key }) => key === options.only) : [...drafts];
  if (selected.length === 0) throw new Error(`Unknown --only target: ${options.only}`);
  if (options.apply && selected.length !== 1) {
    throw new Error("Apply requires one exact --only target");
  }

  const prepared = [];
  for (const draft of selected) {
    const validationErrors = validateCzechiaPageContentSeoDraft(draft);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid ${draft.key} draft: ${validationErrors.join("; ")}`);
    }
    const page = await readPage(client, draft);
    if (!page) throw new Error(`Missing PageContent ${draft.pageContentId}`);
    assertExactSource(page, draft);
    const registerStatus = readClinicalRegisterStatus(clinicalRegisterCsv, draft.canonicalPath);
    assertCzechiaPageContentApplyGate({
      apply: options.apply,
      registerStatus,
      draft,
      approvedHash: options.approvedHash,
      reviewedAt: options.reviewedAt,
      reviewerId: options.reviewerId,
      nativeReviewerId: options.nativeReviewerId,
      nativeReviewedAt: options.nativeReviewedAt,
      confirmation: options.confirmation,
    });
    if (options.apply) await assertEligibleReviewer(client, options.reviewerId!);
    const translation = page.translations[0]!;
    const fields = changedFields(translation as unknown as Record<string, unknown>, draft.copy);
    prepared.push({ draft, page, translation, fields });
    logger.log(`${draft.key}: ${fields.length > 0 ? fields.join(", ") : "no changes"}`);
    logger.log(`  clinical-register=${registerStatus}`);
    logger.log(`  approved-sha256=${czechiaPageContentApprovalSha256(draft)}`);
    logger.log(`  confirm=${czechiaPageContentConfirmationToken(draft)}`);
  }

  if (!options.apply) {
    logger.log("DRY-RUN ONLY. Pending clinical-register rows cannot be applied.");
    return;
  }

  await client.$transaction(async (transaction) => {
    for (const item of prepared) {
      if (item.fields.length === 0) continue;
      const locked = await readPage(transaction, item.draft);
      if (!locked) throw new Error(`Refusing ${item.draft.key}: PageContent disappeared`);
      assertExactSource(locked, item.draft);
      await assertEligibleReviewer(transaction, options.reviewerId!);
      const beforeProtectedState = protectedState(locked, item.draft.copy);
      const result = await transaction.pageContentTranslation.updateMany({
        where: {
          id: item.draft.translationId,
          pageContentId: item.draft.pageContentId,
          locale: item.draft.locale,
          updatedAt: new Date(item.draft.expectedTranslationUpdatedAt),
          pageContent: { country: { code: "cz" } },
        },
        data: item.draft.copy,
      });
      if (result.count !== 1) {
        throw new Error(`Refusing ${item.draft.key}: translation concurrency guard failed`);
      }
      const saved = await readPage(transaction, item.draft);
      const savedTranslation = saved?.translations[0];
      if (!saved || !savedTranslation) throw new Error(`Verification failed: ${item.draft.key} disappeared`);
      for (const [field, value] of Object.entries(item.draft.copy)) {
        if ((savedTranslation as unknown as Record<string, unknown>)[field] !== value) {
          throw new Error(`Verification failed: ${item.draft.key}.${field} did not save exactly`);
        }
      }
      if (protectedState(saved, item.draft.copy) !== beforeProtectedState) {
        throw new Error(`Verification failed: ${item.draft.key} changed a protected field`);
      }
    }
  }, { isolationLevel: "Serializable" });

  logger.log("APPLIED and transactionally verified. Page state and unrelated fields were unchanged.");
}

async function main(): Promise<void> {
  const only = arg("only");
  const apply = process.argv.includes("--apply");
  const register = readFileSync(CLINICAL_REGISTER_PATH, "utf8");
  const draft = CZECHIA_PAGE_CONTENT_SEO_DRAFTS.find(({ key }) => key === only);
  if (apply && draft) {
    const approval = assertCzechiaClinicalApproval(register, {
      asset: draft.canonicalPath,
      approvedSha256: czechiaPageContentApprovalSha256(draft),
    });
    if (approval.reviewer_doctor_id !== arg("reviewer-id")) {
      throw new Error("Refusing to apply: reviewer ID does not match the recorded approval");
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
  await runCzechiaPageContentSeoPatch(
    prisma,
    {
      only,
      apply,
      approvedHash: arg("approved-sha256"),
      reviewedAt: parseCzechiaSeoReviewDate(arg("reviewed-at") ?? undefined),
      reviewerId: arg("reviewer-id"),
      nativeReviewerId: arg("native-reviewer-id"),
      nativeReviewedAt: parseCzechiaPageContentReviewDate(arg("native-reviewed-at") ?? undefined),
      confirmation: arg("confirm"),
    },
    register,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(disconnectDb);
}
