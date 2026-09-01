/**
 * Review-gated Portugal SEO metadata patcher. One existing public record only.
 *
 * Dry run:
 *   node --env-file=.env --import tsx scripts/patch-portugal-seo-metadata.ts --only=service:consulta-medica
 * Apply after clinical approval:
 *   node --env-file=.env --import tsx scripts/patch-portugal-seo-metadata.ts --only=service:consulta-medica --apply \
 *     --source-sha256=<dry-run hash> --approved-sha256=<copy hash> \
 *     --reviewer-doctor-id=<id> --reviewed-at=YYYY-MM-DD \
 *     --confirm=<token> --confirm-database=<protocol://host:port/database>
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Prisma } from "@prisma/client";

import {
  readPortugalDoctorFactRecord,
  type PortugalClinicalReviewRecord,
} from "../src/content/portugal-clinical-approval.js";
import {
  loadPortugalSeoMetadataDrafts,
  portugalSeoApprovalSha256,
  portugalSeoConfirmationToken,
  type PortugalSeoMetadataDraft,
} from "../src/content/portugal-seo-metadata-drafts.js";
import { assertPortugalSeoApplyAuthorized, portugalDatabaseIdentity } from "../src/content/portugal-seo-metadata-patch.js";
import { disconnectDb, prisma } from "../src/db/prisma.js";

const COUNTRY = "pt";
const LOCALE = "PT";

type Reader = Pick<
  Prisma.TransactionClient,
  "country" | "pageContent" | "service" | "doctorCountry" | "doctor"
>;

type MetadataTarget = Readonly<{
  id: string;
  parentId: string;
  targetKind: PortugalSeoMetadataDraft["targetKind"];
  currentTitle: string | null;
  currentDescription: string | null;
  currentKeywords: readonly string[] | null;
  updatedAt: Date;
  doctorProfessionalBody?: string | null;
  doctorRegistrationNumber?: string | null;
  doctorRegistrationVerified?: boolean;
  doctorId?: string;
  doctorSlug?: string;
  doctorFullName?: string;
}>;

function arg(name: string): string | null {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

function draftKey(draft: PortugalSeoMetadataDraft): string {
  return `${draft.targetKind}:${draft.slug}`;
}

async function countryId(reader: Reader): Promise<string> {
  const country = await reader.country.findUnique({ where: { code: COUNTRY }, select: { id: true } });
  if (!country) throw new Error("Portugal country record not found");
  return country.id;
}

async function readTarget(reader: Reader, draft: PortugalSeoMetadataDraft): Promise<MetadataTarget> {
  const ptCountryId = await countryId(reader);

  if (draft.targetKind === "home") {
    const page = await reader.pageContent.findUnique({
      where: { countryId_pageKey: { countryId: ptCountryId, pageKey: "HOME" } },
      select: {
        id: true,
        status: true,
        isActive: true,
        translations: {
          where: { locale: LOCALE },
          select: { id: true, seoTitle: true, seoDescription: true, updatedAt: true },
        },
      },
    });
    if (!page || !page.isActive || page.status !== "PUBLISHED" || page.translations.length !== 1) {
      throw new Error("Portugal HOME is not one active published PT translation");
    }
    const translation = page.translations[0];
    return {
      id: translation.id,
      parentId: page.id,
      targetKind: draft.targetKind,
      currentTitle: translation.seoTitle,
      currentDescription: translation.seoDescription,
      currentKeywords: null,
      updatedAt: translation.updatedAt,
    };
  }

  if (draft.targetKind === "service") {
    const service = await reader.service.findUnique({
      where: { countryId_slug: { countryId: ptCountryId, slug: draft.slug } },
      select: {
        id: true,
        visibility: true,
        isActive: true,
        translations: {
          where: { locale: LOCALE },
          select: { id: true, seoTitle: true, seoDescription: true, updatedAt: true },
        },
      },
    });
    if (!service || !service.isActive || service.visibility !== "PUBLIC" || service.translations.length !== 1) {
      throw new Error(`${draft.slug} is not one active public Portugal PT service translation`);
    }
    const translation = service.translations[0];
    return {
      id: translation.id,
      parentId: service.id,
      targetKind: draft.targetKind,
      currentTitle: translation.seoTitle,
      currentDescription: translation.seoDescription,
      currentKeywords: null,
      updatedAt: translation.updatedAt,
    };
  }

  if (draft.targetKind === "doctor") {
    const listings = await reader.doctorCountry.findMany({
      where: { countryId: ptCountryId, active: true, doctor: { active: true, slug: draft.slug } },
      take: 2,
      select: {
        id: true,
        chamberEntity: true,
        registrationNumber: true,
        isVerified: true,
        doctor: { select: { id: true, slug: true, fullName: true } },
        translations: {
          where: { locale: LOCALE },
          select: {
            id: true,
            seoTitle: true,
            seoDescription: true,
            seoKeywords: true,
            updatedAt: true,
          },
        },
      },
    });
    if (listings.length !== 1 || listings[0].translations.length !== 1) {
      throw new Error(`${draft.slug} is not one active Portugal doctor listing with one PT translation`);
    }
    const listing = listings[0];
    const translation = listing.translations[0];
    return {
      id: translation.id,
      parentId: listing.id,
      targetKind: draft.targetKind,
      currentTitle: translation.seoTitle,
      currentDescription: translation.seoDescription,
      currentKeywords: translation.seoKeywords,
      updatedAt: translation.updatedAt,
      doctorProfessionalBody: listing.chamberEntity,
      doctorRegistrationNumber: listing.registrationNumber,
      doctorRegistrationVerified: listing.isVerified,
      doctorId: listing.doctor.id,
      doctorSlug: listing.doctor.slug,
      doctorFullName: listing.doctor.fullName,
    };
  }

  throw new Error(`${draft.asset} is owned by the static runtime source`);
}

function sourceSha256(target: MetadataTarget): string {
  return createHash("sha256").update(JSON.stringify(target)).digest("hex");
}

function assertAuditedSource(draft: PortugalSeoMetadataDraft, target: MetadataTarget): void {
  const retiredMedicareSuffix = " Aceitamos também Medicare para este serviço.";
  const inheritedHomeTitle = draft.targetKind === "home"
    && target.currentTitle === null
    && draft.originalTitle === "Médico Online Portugal | Clínicos e Especialistas Registados";
  const storedDoctorTitle = draft.targetKind === "doctor"
    && target.currentTitle === `${draft.originalTitle} | Global Health Portugal`;
  const safetyNormalizedServiceDescription = draft.targetKind === "service"
    && draft.originalDescription.endsWith(retiredMedicareSuffix)
    && target.currentDescription === draft.originalDescription.slice(0, -retiredMedicareSuffix.length);
  if (
    (!inheritedHomeTitle && !storedDoctorTitle && target.currentTitle !== draft.originalTitle)
    || (!safetyNormalizedServiceDescription && target.currentDescription !== draft.originalDescription)
  ) {
    throw new Error("Current Portugal metadata does not match the source reviewed in the completion matrix");
  }
  if (
    draft.targetKind === "doctor" &&
    (!target.doctorRegistrationVerified || !target.doctorProfessionalBody || !target.doctorRegistrationNumber)
  ) {
    throw new Error("Portugal doctor target must retain a verified professional registration");
  }
}

async function assertEligibleReviewer(reader: Reader, approval: PortugalClinicalReviewRecord): Promise<void> {
  const reviewer = await reader.doctor.findUnique({
    where: { id: approval.reviewer_doctor_id },
    select: {
      active: true,
      fullName: true,
      additionalCountries: {
        where: { active: true, country: { code: COUNTRY } },
        select: { isVerified: true, chamberEntity: true, registrationNumber: true },
      },
    },
  });
  const registration = reviewer?.additionalCountries.length === 1 ? reviewer.additionalCountries[0] : null;
  if (!reviewer?.active || !registration?.isVerified || !registration.registrationNumber?.trim()) {
    throw new Error("Reviewer must have an active verified Portugal professional registration");
  }
  if (reviewer.fullName !== approval.reviewer_name) {
    throw new Error("Clinical reviewer name does not match the doctor record");
  }
  if (registration.chamberEntity !== approval.clinical_reviewer_professional_body) {
    throw new Error("Clinical reviewer professional body does not match the approval register");
  }
}

function assertDoctorCredentialEvidence(
  draft: PortugalSeoMetadataDraft,
  target: MetadataTarget,
  factRegisterCsv: string,
  approval: PortugalClinicalReviewRecord,
): void {
  if (draft.targetKind !== "doctor") return;
  const fact = readPortugalDoctorFactRecord(factRegisterCsv, draft.asset);
  const normalized = (value: string) => value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
  if (
    target.doctorId !== approval.credential_subject_doctor_id ||
    target.doctorSlug !== draft.slug ||
    target.doctorSlug !== fact.slug ||
    !target.doctorFullName ||
    normalized(target.doctorFullName) !== normalized(fact.display_name) ||
    !target.doctorRegistrationVerified ||
    target.doctorProfessionalBody !== fact.professional_body ||
    target.doctorRegistrationNumber !== fact.registration_number
  ) {
    throw new Error("Live Portugal doctor registration does not match the approved fact record");
  }
}

async function writeTarget(
  transaction: Prisma.TransactionClient,
  draft: PortugalSeoMetadataDraft,
  target: MetadataTarget,
): Promise<void> {
  const data = { seoTitle: draft.proposedTitle!, seoDescription: draft.proposedDescription! };
  const where = { id: target.id, updatedAt: target.updatedAt };
  const result = target.targetKind === "home"
    ? await transaction.pageContentTranslation.updateMany({
        where: { ...where, pageContentId: target.parentId, locale: LOCALE },
        data,
      })
    : target.targetKind === "service"
      ? await transaction.serviceTranslation.updateMany({
          where: { ...where, serviceId: target.parentId, locale: LOCALE },
          data,
        })
      : await transaction.doctorMarketTranslation.updateMany({
          where: { ...where, doctorCountryId: target.parentId, locale: LOCALE },
          data: { ...data, seoKeywords: [draft.primaryKeyword, ...draft.secondaryKeywords] },
        });
  if (result.count !== 1) throw new Error("Portugal SEO metadata concurrency guard failed");
}

export async function runPortugalSeoMetadataPatch(
  client: typeof prisma,
  options: Readonly<{
    only: string | null;
    apply: boolean;
    registerCsv: string;
    factRegisterCsv: string;
    approvedHash: string | null;
    sourceHash: string | null;
    confirmation: string | null;
    reviewerDoctorId: string | null;
    reviewedAt: string | null;
    databaseUrl: string | undefined;
    confirmationDatabase: string | null;
  }>,
  logger: Pick<Console, "log"> = console,
): Promise<void> {
  if (!options.only) throw new Error("Pass exactly one --only=<home|service|doctor|tool>:<slug>");
  const drafts = loadPortugalSeoMetadataDrafts().filter((draft) => draftKey(draft) === options.only);
  if (drafts.length !== 1) throw new Error(`Unsupported or duplicate --only=${options.only}`);
  const draft = drafts[0];

  const approval = assertPortugalSeoApplyAuthorized({
    apply: options.apply,
    draft,
    registerCsv: options.registerCsv,
    factRegisterCsv: options.factRegisterCsv,
    approvedHash: options.approvedHash,
    confirmation: options.confirmation,
    reviewerDoctorId: options.reviewerDoctorId,
    reviewedAt: options.reviewedAt,
    databaseUrl: options.databaseUrl,
    confirmationDatabase: options.confirmationDatabase,
  });

  const before = await readTarget(client, draft);
  const currentSourceHash = sourceSha256(before);
  logger.log(`${options.apply ? "APPLY" : "DRY RUN"}: ${draft.asset}`);
  logger.log(`  source sha256: ${currentSourceHash}`);
  logger.log(`  approval sha256: ${portugalSeoApprovalSha256(draft)}`);
  logger.log(`  confirmation: ${portugalSeoConfirmationToken(draft)}`);
  if (options.databaseUrl) logger.log(`  database target: ${portugalDatabaseIdentity(options.databaseUrl)}`);
  logger.log(`  title: ${before.currentTitle ?? "(null)"} -> ${draft.proposedTitle ?? "RETAIN"}`);
  logger.log(`  description: ${before.currentDescription ?? "(null)"} -> ${draft.proposedDescription ?? "RETAIN"}`);

  if (!options.apply) return;
  assertAuditedSource(draft, before);
  if (options.sourceHash !== currentSourceHash) {
    throw new Error("Source SHA-256 does not match the current Portugal record");
  }

  await client.$transaction(async (transaction) => {
    const locked = await readTarget(transaction, draft);
    if (sourceSha256(locked) !== currentSourceHash) {
      throw new Error("Portugal metadata changed after the guarded read");
    }
    assertAuditedSource(draft, locked);
    await assertEligibleReviewer(transaction, approval!);
    assertDoctorCredentialEvidence(draft, locked, options.factRegisterCsv, approval!);
    await writeTarget(transaction, draft, locked);
    const saved = await readTarget(transaction, draft);
    const expectedKeywords = [draft.primaryKeyword, ...draft.secondaryKeywords];
    if (
      saved.currentTitle !== draft.proposedTitle ||
      saved.currentDescription !== draft.proposedDescription ||
      (draft.targetKind === "doctor" && JSON.stringify(saved.currentKeywords) !== JSON.stringify(expectedKeywords))
    ) {
      throw new Error("Portugal SEO metadata verification failed");
    }
  }, { isolationLevel: "Serializable" });
  logger.log("VERIFIED: one Portugal metadata record updated; all other fields preserved.");
}

async function main(): Promise<void> {
  const root = process.cwd().endsWith("backend") ? resolve(process.cwd(), "..") : process.cwd();
  const registerCsv = readFileSync(resolve(root, "seo/portugal/clinical-review-register.csv"), "utf8");
  const factRegisterCsv = readFileSync(resolve(root, "seo/portugal/doctor-profile-fact-register.csv"), "utf8");
  await runPortugalSeoMetadataPatch(prisma, {
    only: arg("only"),
    apply: process.argv.includes("--apply"),
    registerCsv,
    factRegisterCsv,
    approvedHash: arg("approved-sha256"),
    sourceHash: arg("source-sha256"),
    confirmation: arg("confirm"),
    reviewerDoctorId: arg("reviewer-doctor-id"),
    reviewedAt: arg("reviewed-at"),
    databaseUrl: process.env.DATABASE_URL,
    confirmationDatabase: arg("confirm-database"),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    })
    .finally(disconnectDb);
}
