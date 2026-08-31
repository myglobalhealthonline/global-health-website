/* eslint-disable no-console */
/**
 * Normalize the existing Czech job description and add its five missing
 * translations. Dry-run by default.
 *
 *   node --env-file=.env --import tsx scripts/patch-czechia-career-locales.ts
 *   node --env-file=.env --import tsx scripts/patch-czechia-career-locales.ts \
 *     --apply --confirm=CZ-CAREER-TRANSLATIONS-2026-09-01 --confirm-host=<database-host>
 */
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Prisma, type JobListing, type LocaleCode } from "@prisma/client";
import { sanitizeCareerHtml } from "../src/utils/sanitize-html.js";
import { CZECHIA_CAREER_LOCALIZATIONS } from "./data/czechia-career-locales.js";

export const CONFIRMATION = "CZ-CAREER-TRANSLATIONS-2026-09-01";
const COUNTRY_CODE = "cz";
const SLUG = "prakticky-lekar-cesko";
const SOURCE_ID = "cmtheyvc6002701qmkiaq84tb";
const SOURCE_UPDATED_AT = new Date("2026-08-31T15:55:39.683Z");
const SOURCE_DESCRIPTION_SHA256 = "cd9af6650c02617756497d4c3bf5e04bbd428d0bee426bf8176438e65e78e808";
const LOCALES = Object.keys(CZECHIA_CAREER_LOCALIZATIONS).sort() as LocaleCode[];

type CountrySnapshot = {
  id: string;
  code: string;
  isActive: boolean;
  defaultLocale: LocaleCode;
  countryLocales: Array<{ locale: LocaleCode }>;
};

type JobSnapshot = Pick<JobListing,
  "id" | "countryId" | "locale" | "slug" | "title" | "department" | "location" |
  "workplaceMode" | "employmentType" | "minimumExperience" | "descriptionHtml" |
  "status" | "publishedAt" | "closesAt" | "createdByUserId" | "updatedByUserId" | "updatedAt"
>;

function descriptionHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function matchesLocalization(row: JobSnapshot, locale: LocaleCode) {
  const expected = CZECHIA_CAREER_LOCALIZATIONS[locale];
  return row.locale === locale &&
    row.title === expected.title &&
    row.department === expected.department &&
    row.location === expected.location &&
    row.employmentType === expected.employmentType &&
    row.minimumExperience === expected.minimumExperience &&
    row.descriptionHtml === expected.descriptionHtml;
}

function sameOptionalDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

function matchesSharedSettings(row: JobSnapshot, source: JobSnapshot) {
  return row.workplaceMode === source.workplaceMode &&
    row.status === source.status &&
    sameOptionalDate(row.publishedAt, source.publishedAt) &&
    sameOptionalDate(row.closesAt, source.closesAt);
}

export function assertSafeLocalizations() {
  for (const [locale, localization] of Object.entries(CZECHIA_CAREER_LOCALIZATIONS)) {
    if (sanitizeCareerHtml(localization.descriptionHtml) !== localization.descriptionHtml) {
      throw new Error(`${locale} description changes during sanitization`);
    }
  }
}

export function assertApplyArguments(apply: boolean, argv: string[], databaseUrl: string | undefined) {
  if (!apply) return;
  const confirmation = argv.find((arg) => arg.startsWith("--confirm="))?.slice("--confirm=".length);
  const confirmedHost = argv.find((arg) => arg.startsWith("--confirm-host="))?.slice("--confirm-host=".length);
  const actualHost = databaseUrl ? new URL(databaseUrl).hostname : "";
  if (confirmation !== CONFIRMATION) throw new Error("Missing or invalid production confirmation token");
  if (!actualHost || confirmedHost !== actualHost) throw new Error("Database host confirmation does not match DATABASE_URL");
}

export function validateCareerPatchState(country: CountrySnapshot, rows: JobSnapshot[]) {
  const enabledLocales = [...new Set([
    country.defaultLocale,
    ...country.countryLocales.map(({ locale }) => locale),
  ])].sort();
  if (country.code !== COUNTRY_CODE || !country.isActive || country.defaultLocale !== "CS") {
    throw new Error("Czechia country configuration does not match the reviewed snapshot");
  }
  if (enabledLocales.join(",") !== LOCALES.join(",")) {
    throw new Error(`Enabled Czechia locales changed: ${enabledLocales.join(",")}`);
  }

  const source = rows.find(({ locale }) => locale === "CS");
  if (!source || source.id !== SOURCE_ID || source.countryId !== country.id || source.slug !== SLUG) {
    throw new Error("Reviewed Czech source job was not found");
  }
  if (source.status !== "PUBLISHED") throw new Error("Reviewed Czech source job is no longer published");

  const sourceAlreadyNormalized = matchesLocalization(source, "CS");
  if (!sourceAlreadyNormalized) {
    const sourceMatchesSnapshot = source.updatedAt.getTime() === SOURCE_UPDATED_AT.getTime() &&
      source.title === "Praktický lékař — Přidejte se ke Global Health, Česko" &&
      source.department === "Medical" &&
      source.location === "Česko (na dálku)" &&
      source.employmentType === "DPP nebo OSVČ · plný či částečný úvazek" &&
      source.minimumExperience === "Platná licence ČLK" &&
      descriptionHash(source.descriptionHtml) === SOURCE_DESCRIPTION_SHA256;
    if (!sourceMatchesSnapshot) throw new Error("Czech source job changed after review; refusing to overwrite it");
  }

  for (const row of rows) {
    if (!LOCALES.includes(row.locale)) throw new Error(`Unexpected locale row: ${row.locale}`);
    if (row.locale !== "CS" && (!matchesLocalization(row, row.locale) || !matchesSharedSettings(row, source))) {
      throw new Error(`Existing ${row.locale} translation differs from the reviewed payload or shared settings`);
    }
  }

  return {
    source,
    sourceAlreadyNormalized,
    missingLocales: LOCALES.filter((locale) => !rows.some((row) => row.locale === locale)),
    attributionNeedsCorrection: source.updatedByUserId !== null || rows.some((row) => (
      row.locale !== "CS" && (row.createdByUserId !== null || row.updatedByUserId !== null)
    )),
  };
}

const jobSelect = {
  id: true,
  countryId: true,
  locale: true,
  slug: true,
  title: true,
  department: true,
  location: true,
  workplaceMode: true,
  employmentType: true,
  minimumExperience: true,
  descriptionHtml: true,
  status: true,
  publishedAt: true,
  closesAt: true,
  createdByUserId: true,
  updatedByUserId: true,
  updatedAt: true,
} satisfies Prisma.JobListingSelect;

async function run() {
  const apply = process.argv.includes("--apply");
  assertApplyArguments(apply, process.argv, process.env.DATABASE_URL);
  assertSafeLocalizations();
  const { prisma, disconnectDb } = await import("../src/db/prisma.js");

  try {
    const country = await prisma.country.findUnique({
      where: { code: COUNTRY_CODE },
      select: {
        id: true,
        code: true,
        isActive: true,
        defaultLocale: true,
        countryLocales: { select: { locale: true } },
      },
    });
    if (!country) throw new Error("Czechia country row not found");
    const rows = await prisma.jobListing.findMany({
      where: { countryId: country.id, slug: SLUG },
      select: jobSelect,
      orderBy: { locale: "asc" },
    });
    const current = validateCareerPatchState(country, rows);

    console.log(`${apply ? "APPLY" : "DRY RUN"}: ${SLUG}`);
    console.log(`  normalize CS: ${current.sourceAlreadyNormalized ? "already done" : "yes"}`);
    console.log(`  create locales: ${current.missingLocales.join(", ") || "none"}`);
    console.log(`  system attribution: ${current.attributionNeedsCorrection ? "needs correction" : "already correct"}`);
    if (!apply) {
      console.log(`Dry-run only. Re-run with --apply, --confirm=${CONFIRMATION}, and --confirm-host.`);
      return;
    }
    if (current.sourceAlreadyNormalized && current.missingLocales.length === 0 && !current.attributionNeedsCorrection) {
      console.log("Already applied; no changes made.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      const lockedCountry = await tx.country.findUnique({
        where: { code: COUNTRY_CODE },
        select: {
          id: true,
          code: true,
          isActive: true,
          defaultLocale: true,
          countryLocales: { select: { locale: true } },
        },
      });
      if (!lockedCountry) throw new Error("Czechia country row not found during apply");
      const lockedRows = await tx.jobListing.findMany({
        where: { countryId: lockedCountry.id, slug: SLUG },
        select: jobSelect,
        orderBy: { locale: "asc" },
      });
      const locked = validateCareerPatchState(lockedCountry, lockedRows);

      if (!locked.sourceAlreadyNormalized) {
        const updated = await tx.jobListing.updateMany({
          where: { id: SOURCE_ID, locale: "CS", slug: SLUG, updatedAt: SOURCE_UPDATED_AT },
          data: { ...CZECHIA_CAREER_LOCALIZATIONS.CS, updatedByUserId: null },
        });
        if (updated.count !== 1) throw new Error("Czech source job changed during apply");
      }

      for (const locale of locked.missingLocales) {
        const localized = CZECHIA_CAREER_LOCALIZATIONS[locale];
        await tx.jobListing.create({
          data: {
            countryId: locked.source.countryId,
            locale,
            slug: locked.source.slug,
            workplaceMode: locked.source.workplaceMode,
            status: locked.source.status,
            publishedAt: locked.source.publishedAt,
            closesAt: locked.source.closesAt,
            ...localized,
          },
        });
      }

      if (locked.attributionNeedsCorrection) {
        await tx.jobListing.update({
          where: { id: SOURCE_ID },
          data: { updatedByUserId: null },
        });
        await tx.jobListing.updateMany({
          where: { countryId: lockedCountry.id, slug: SLUG, locale: { not: "CS" } },
          data: { createdByUserId: null, updatedByUserId: null },
        });
      }

      const finalRows = await tx.jobListing.findMany({
        where: { countryId: lockedCountry.id, slug: SLUG },
        select: jobSelect,
        orderBy: { locale: "asc" },
      });
      const final = validateCareerPatchState(lockedCountry, finalRows);
      if (!final.sourceAlreadyNormalized || final.missingLocales.length) {
        throw new Error("Translation readback verification failed");
      }
      const previousPatchAudit = await tx.auditLog.findFirst({
        where: {
          action: "JOB_UPDATED",
          entityType: "JobListing",
          entityId: SOURCE_ID,
          metadata: { path: ["source"], equals: "czechia-career-locales-patch" },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: null,
          actorRole: "SYSTEM",
          action: "JOB_UPDATED",
          entityType: "JobListing",
          entityId: SOURCE_ID,
          metadata: {
            slug: SLUG,
            locales: LOCALES,
            jobListingIds: finalRows.map(({ id }) => id),
            source: "czechia-career-locales-patch",
            ...(previousPatchAudit ? { correctsAuditLogId: previousPatchAudit.id } : {}),
          },
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 15_000,
    });
    console.log("Applied and verified six localized job rows.");
  } finally {
    await disconnectDb();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
