/**
 * One-time: set Country.accessModel per market.
 *
 *   CLINIC   — pt, cz, ie (same-country doctors may access records with
 *              patient COUNTRY_CLINIC consent; see medical-access-guard.ts §4d)
 *   PLATFORM — br, es, ro (only the treating doctor; also the schema default,
 *              so these rows are set explicitly for auditability, not because
 *              anything would break if left alone)
 *
 * Idempotent: only writes rows whose accessModel differs from the target.
 * Missing country codes are skipped with a warning, not fatal.
 *
 *   node --env-file=.env --import tsx scripts/set-country-access-models.ts             # dry-run
 *   node --env-file=.env --import tsx scripts/set-country-access-models.ts --apply     # write
 */
import { CountryAccessModel } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

const TARGETS: Record<string, CountryAccessModel> = {
  pt: "CLINIC",
  cz: "CLINIC",
  ie: "CLINIC",
  br: "PLATFORM",
  es: "PLATFORM",
  ro: "PLATFORM",
};

async function main() {
  console.log(APPLY ? "Applying country access models...\n" : "Dry run (pass --apply to write)\n");

  for (const [code, target] of Object.entries(TARGETS)) {
    const country = await prisma.country.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, accessModel: true },
    });

    if (!country) {
      console.warn(`  [skip] country code "${code}" not found`);
      continue;
    }

    if (country.accessModel === target) {
      console.log(`  [ok]   ${country.name} (${code}): already ${target}`);
      continue;
    }

    console.log(`  [diff] ${country.name} (${code}): ${country.accessModel} -> ${target}`);

    if (APPLY) {
      await prisma.country.update({
        where: { id: country.id },
        data: { accessModel: target },
      });
    }
  }

  console.log(APPLY ? "\nDone." : "\nDry run complete — re-run with --apply to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
