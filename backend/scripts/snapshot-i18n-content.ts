import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { prisma } from "../src/db/prisma.js";

/**
 * Content-only logical snapshot for the multilingual audit. This is not a
 * substitute for an operator-controlled pg_dump, but it is sufficient to
 * prove which CMS rows existed before an approved translation upsert.
 * Output defaults outside the repository because content may contain HTML,
 * SEO copy, legal text, and other business-sensitive material.
 */
const CONTENT_MODELS = [
  "country",
  "countryLocale",
  "service",
  "serviceTranslation",
  "serviceFaq",
  "serviceFaqTranslation",
  "doctor",
  "doctorTranslation",
  "doctorMarketTranslation",
  "doctorFaq",
  "specialty",
  "specialtyTranslation",
  "healthTest",
  "healthTestTranslation",
  "healthTestFaq",
  "healthTestFaqTranslation",
  "contentPage",
  "seoLandingPage",
  "seoLandingPageTranslation",
  "pricingPlan",
  "planTranslation",
  "blogPost",
  "blogTranslation",
  "countryFooter",
  "countryLegalProfile",
  "countryLegalDocument",
  "countryAuthorityLink",
  "countryDisclaimerTranslation",
  "serviceLinkTranslation",
] as const;

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outputDir = path.resolve(
  process.env.SNAPSHOT_OUTPUT_DIR?.trim() || path.join(os.tmpdir(), "gh-i18n-snapshots"),
);
const outputPath = path.join(outputDir, `i18n-content-${stamp}.json`);

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const tables: Record<string, unknown[]> = {};

  for (const model of CONTENT_MODELS) {
    // Prisma's generated client exposes these model delegates in camelCase.
    const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[model];
    if (!delegate) throw new Error(`Missing Prisma model delegate: ${model}`);
    tables[model] = await delegate.findMany();
    console.log(`  ${model}: ${tables[model].length} row(s)`);
  }

  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        purpose: "Pre-approval multilingual content snapshot",
        supportedLocales: ["EN", "PT", "ES", "CS", "RO", "DE"],
        tables,
      },
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
  console.log(`\nSnapshot -> ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
