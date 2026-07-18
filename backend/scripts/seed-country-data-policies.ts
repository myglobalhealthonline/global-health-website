/**
 * One-off seed: CountryDataPolicy.retentionYears per country (Task 1d).
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-country-data-policies.ts [--dry-run]
 *
 * Idempotent upsert keyed by Country.code. Countries not yet in the DB are
 * logged and skipped — never created here (mirrors seed-country-disclaimers.ts).
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

// Medical-record retention minimums per jurisdiction (see country-data-policy.service.ts
// RETENTION_HINTS — same source figures, now persisted onto CountryDataPolicy rows).
const RETENTION_YEARS: Record<string, number> = {
  br: 20,
  pt: 15,
  ie: 8,
  es: 15,
  cz: 10,
  ro: 10,
};

async function main(): Promise<void> {
  let upserted = 0;
  for (const [code, retentionYears] of Object.entries(RETENTION_YEARS)) {
    const country = await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { id: true, code: true },
    });
    if (!country) {
      console.warn(`[data-policy] skip ${code}: country not found`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`[data-policy] would upsert ${code} retentionYears=${retentionYears}`);
      upserted += 1;
      continue;
    }
    await prisma.countryDataPolicy.upsert({
      where: { countryCode: country.code },
      create: { countryId: country.id, countryCode: country.code, retentionYears },
      update: { retentionYears },
    });
    console.log(`[data-policy] upserted ${code} retentionYears=${retentionYears}`);
    upserted += 1;
  }
  console.log(`[data-policy] done — ${upserted} country/countries ${DRY_RUN ? "would be " : ""}updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
