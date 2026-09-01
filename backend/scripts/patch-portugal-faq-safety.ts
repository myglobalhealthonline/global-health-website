/**
 * Correct one deprecated Portugal crisis contact without touching profile,
 * clinical, booking, price, or translation fields.
 *
 * Dry run:
 *   node --env-file=.env --import tsx scripts/patch-portugal-faq-safety.ts --only=<patch-id>
 * Apply the exact dry-run source:
 *   node --env-file=.env --import tsx scripts/patch-portugal-faq-safety.ts --only=<patch-id> --apply \
 *     --source-sha256=<hash> --confirm=<token> \
 *     --confirm-database=<protocol://host:port/database>
 */
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Prisma } from "@prisma/client";

import { assertPortugalFaqSafetyApplyAuthorized } from "../src/content/portugal-faq-safety-patch.js";
import {
  PORTUGAL_SAFETY_PATCHES,
  portugalFaqSafetyPatchToken,
  type PortugalSafetyPatch,
} from "../src/content/portugal-faq-safety-patches.js";
import { portugalDatabaseIdentity } from "../src/content/portugal-seo-metadata-patch.js";

const COUNTRY = "pt";
const LOCALE = "PT";

type Reader = Pick<
  Prisma.TransactionClient,
  "country" | "countryLegalDocument" | "doctorCountry" | "doctorFaq" | "service" | "serviceFaq"
>;

export type PortugalFaqSafetyDb = Reader & Readonly<{
  $transaction: (
    callback: (transaction: Prisma.TransactionClient) => Promise<void>,
    options: { isolationLevel: "Serializable" },
  ) => Promise<void>;
}>;

type FaqTarget = Readonly<{
  targetKind: "faq";
  id: string;
  question: string;
  answer: string;
  updatedAt: Date;
}>;

type LegalTarget = Readonly<{
  targetKind: "legalDocument";
  id: string;
  content: string;
  version: number;
  publishedAt: Date | null;
  updatedAt: Date;
}>;

type Target = FaqTarget | LegalTarget;

function arg(name: string): string | null {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

function sourceSha256(target: Target): string {
  return createHash("sha256").update(JSON.stringify(target)).digest("hex");
}

async function countryId(reader: Reader): Promise<string> {
  const country = await reader.country.findUnique({ where: { code: COUNTRY }, select: { id: true } });
  if (!country) throw new Error("Portugal country record not found");
  return country.id;
}

async function readTarget(reader: Reader, patch: PortugalSafetyPatch): Promise<Target> {
  if (patch.targetKind === "legalDocument") {
    const ptCountryId = await countryId(reader);
    const row = await reader.countryLegalDocument.findUnique({
      where: {
        countryId_type_locale: {
          countryId: ptCountryId,
          type: "MEDICAL_DISCLAIMER",
          locale: patch.locale,
        },
      },
      select: {
        id: true,
        content: true,
        isPublished: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    if (!row?.isPublished || !row.content) {
      throw new Error("Published Portugal medical disclaimer not found");
    }
    return {
      targetKind: "legalDocument",
      id: row.id,
      content: row.content,
      version: row.version,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
    };
  }

  if (patch.targetKind === "doctor") {
    const listings = await reader.doctorCountry.findMany({
      where: { active: true, doctor: { active: true, slug: patch.slug } },
      take: 2,
      select: { doctorId: true, country: { select: { code: true } } },
    });
    if (listings.length !== 1 || listings[0].country.code !== COUNTRY) {
      throw new Error(`${patch.slug} is not exclusive to one active Portugal listing`);
    }
    const rows = await reader.doctorFaq.findMany({
      where: {
        doctorId: listings[0].doctorId,
        locale: LOCALE,
        isActive: true,
        question: patch.question,
      },
      take: 2,
      select: { id: true, question: true, answer: true, updatedAt: true },
    });
    if (rows.length !== 1) throw new Error(`Expected one active PT doctor FAQ for ${patch.id}`);
    return { targetKind: "faq", ...rows[0] };
  }

  const ptCountryId = await countryId(reader);
  const service = await reader.service.findUnique({
    where: { countryId_slug: { countryId: ptCountryId, slug: patch.slug } },
    select: { id: true, isActive: true, visibility: true },
  });
  if (!service?.isActive || service.visibility !== "PUBLIC") {
    throw new Error(`${patch.slug} is not an active public Portugal service`);
  }
  const rows = await reader.serviceFaq.findMany({
    where: { serviceId: service.id, isVisible: true, question: patch.question },
    take: 2,
    select: { id: true, question: true, answer: true, updatedAt: true },
  });
  if (rows.length !== 1) throw new Error(`Expected one visible Portugal service FAQ for ${patch.id}`);
  return { targetKind: "faq", ...rows[0] };
}

function occurrences(value: string, fragment: string): number {
  return value.split(fragment).length - 1;
}

function targetStatus(target: Target, patch: PortugalSafetyPatch): "pending" | "already applied" | "drift" {
  if (patch.targetKind !== "legalDocument") {
    if (target.targetKind !== "faq") return "drift";
    if (target.answer === patch.originalAnswer) return "pending";
    if (target.answer === patch.proposedAnswer) return "already applied";
    return "drift";
  }
  if (target.targetKind !== "legalDocument") return "drift";
  const groups = new Map<string, typeof patch.fragments>();
  for (const fragment of patch.fragments) {
    groups.set(fragment.proposed, [...(groups.get(fragment.proposed) ?? []), fragment]);
  }
  let applied = true;
  for (const [proposed, fragments] of groups) {
    const expectedOccurrences = fragments.reduce((total, fragment) => total + fragment.expectedOccurrences, 0);
    const pending = fragments.every(
      (fragment) => occurrences(target.content, fragment.original) === fragment.expectedOccurrences,
    ) && occurrences(target.content, proposed) === 0;
    const groupApplied = fragments.every((fragment) => !target.content.includes(fragment.original))
      && occurrences(target.content, proposed) === expectedOccurrences;
    if (!pending && !groupApplied) return "drift";
    applied = applied && groupApplied;
  }
  if (!patch.publication) return applied ? "already applied" : "pending";

  const publishedAt = target.publishedAt?.toISOString() ?? null;
  const publicationPending = target.version === patch.publication.expectedVersion
    && publishedAt === patch.publication.expectedPublishedAt;
  const publicationApplied = target.version === patch.publication.proposedVersion
    && publishedAt === patch.publication.proposedPublishedAt;
  if (!publicationPending && !publicationApplied) return "drift";
  return applied && publicationApplied ? "already applied" : "pending";
}

async function writeTarget(
  transaction: Prisma.TransactionClient,
  patch: PortugalSafetyPatch,
  target: Target,
): Promise<void> {
  if (patch.targetKind === "legalDocument") {
    if (target.targetKind !== "legalDocument") throw new Error("Portugal legal target mismatch");
    const content = patch.fragments.reduce(
      (value, fragment) => value.replaceAll(fragment.original, fragment.proposed),
      target.content,
    );
    const publicationPending = patch.publication
      && target.version === patch.publication.expectedVersion
      && target.publishedAt?.toISOString() === patch.publication.expectedPublishedAt;
    const result = await transaction.countryLegalDocument.updateMany({
      where: {
        id: target.id,
        content: target.content,
        version: target.version,
        publishedAt: target.publishedAt,
        updatedAt: target.updatedAt,
        isPublished: true,
        type: "MEDICAL_DISCLAIMER",
        locale: patch.locale,
      },
      data: {
        content,
        ...(publicationPending ? {
          version: patch.publication.proposedVersion,
          publishedAt: new Date(patch.publication.proposedPublishedAt),
        } : {}),
      },
    });
    if (result.count !== 1) throw new Error("Portugal disclaimer safety concurrency guard failed");
    return;
  }
  if (target.targetKind !== "faq") throw new Error("Portugal FAQ target mismatch");
  const where = {
    id: target.id,
    question: patch.question,
    answer: patch.originalAnswer,
    updatedAt: target.updatedAt,
  };
  const result = patch.targetKind === "doctor"
    ? await transaction.doctorFaq.updateMany({ where, data: { answer: patch.proposedAnswer } })
    : await transaction.serviceFaq.updateMany({ where, data: { answer: patch.proposedAnswer } });
  if (result.count !== 1) throw new Error("Portugal FAQ safety concurrency guard failed");
}

export async function runPortugalFaqSafetyPatch(
  client: PortugalFaqSafetyDb,
  options: Readonly<{
    only: string | null;
    apply: boolean;
    sourceHash: string | null;
    confirmation: string | null;
    databaseUrl: string | undefined;
    confirmationDatabase: string | null;
  }>,
  logger: Pick<Console, "log"> = console,
): Promise<void> {
  const matches = PORTUGAL_SAFETY_PATCHES.filter((patch) => patch.id === options.only);
  if (matches.length !== 1) throw new Error("Pass exactly one supported --only=<patch-id>");
  const patch = matches[0];
  const before = await readTarget(client, patch);
  const status = targetStatus(before, patch);
  if (status === "drift") throw new Error(`Portugal safety source drift for ${patch.id}`);

  const currentSourceHash = sourceSha256(before);
  const confirmation = portugalFaqSafetyPatchToken(patch);
  logger.log(`${options.apply ? "APPLY" : "DRY RUN"}: ${patch.id}`);
  logger.log(`  source sha256: ${currentSourceHash}`);
  logger.log(`  confirmation: ${confirmation}`);
  if (options.databaseUrl) {
    logger.log(`  database target: ${portugalDatabaseIdentity(options.databaseUrl)}`);
  }
  logger.log(`  status: ${status}`);
  logger.log(`  evidence: ${patch.evidenceUrls.join(" | ")}`);

  if (status === "already applied" || !options.apply) return;
  assertPortugalFaqSafetyApplyAuthorized({
    apply: true,
    patch,
    currentSourceSha256: currentSourceHash,
    sourceSha256: options.sourceHash,
    confirmation: options.confirmation,
    databaseUrl: options.databaseUrl,
    confirmationDatabase: options.confirmationDatabase,
  });

  await client.$transaction(async (transaction) => {
    const locked = await readTarget(transaction, patch);
    if (sourceSha256(locked) !== currentSourceHash || targetStatus(locked, patch) !== "pending") {
      throw new Error("Portugal safety content changed after the guarded read");
    }
    await writeTarget(transaction, patch, locked);
    const saved = await readTarget(transaction, patch);
    if (targetStatus(saved, patch) !== "already applied") {
      throw new Error("Portugal safety verification failed");
    }
  }, { isolationLevel: "Serializable" });
  logger.log("VERIFIED: one Portugal safety record corrected; all other fields preserved.");
}

async function main(): Promise<void> {
  const { disconnectDb, prisma } = await import("../src/db/prisma.js");
  try {
    await runPortugalFaqSafetyPatch(prisma as unknown as PortugalFaqSafetyDb, {
      only: arg("only"),
      apply: process.argv.includes("--apply"),
      sourceHash: arg("source-sha256"),
      confirmation: arg("confirm"),
      databaseUrl: process.env.DATABASE_URL,
      confirmationDatabase: arg("confirm-database"),
    });
  } finally {
    await disconnectDb();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
