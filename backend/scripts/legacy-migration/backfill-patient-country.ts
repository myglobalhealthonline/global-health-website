/**
 * Categorise patients by country so they appear under the right country in the
 * admin Patients section:
 *   1. Normalise any legacy UPPERCASE country folder to lowercase (Country.code
 *      is lowercase — "ie","pt",... — and the filter/guards compare against it).
 *   2. For patients still missing a country, derive it from their stored phone
 *      dial prefix (+353 -> ie, +351 -> pt, +34 -> es, +420 -> cz, +40 -> ro,
 *      +55 -> br). Address is not available here; phone only.
 * Only ever FILLS a missing country — never overwrites one already set.
 *
 *   node --import tsx scripts/legacy-migration/backfill-patient-country.ts            # dry
 *   DRY_RUN=false node --import tsx scripts/legacy-migration/backfill-patient-country.ts
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { DRY_RUN, banner } from "./lib/config.js";
import { countryFromPhone } from "./lib/contacts-csv.js";
import { Counter } from "./lib/report.js";

async function main() {
  banner("backfill-patient-country");
  const c = new Counter();

  // 1. normalise case (Country.code is lowercase)
  const upper = await prisma.patientProfile.findMany({
    where: { NOT: { countryFolderCode: null } },
    select: { id: true, countryFolderCode: true, originCountryCode: true },
  });
  for (const p of upper) {
    const lc = p.countryFolderCode?.toLowerCase() ?? null;
    const lo = p.originCountryCode?.toLowerCase() ?? null;
    if (lc === p.countryFolderCode && lo === p.originCountryCode) continue;
    c.bump("case-normalised");
    if (!DRY_RUN) {
      await prisma.patientProfile.update({
        where: { id: p.id },
        data: { countryFolderCode: lc, originCountryCode: lo },
      });
    }
  }

  // 2. derive from phone for those with no country
  const missing = await prisma.patientProfile.findMany({
    where: { countryFolderCode: null },
    select: { id: true, phone: true },
  });
  console.log(`  ${missing.length} patients without a country`);
  for (const p of missing) {
    const code = countryFromPhone(p.phone ? (p.phone.startsWith("+") ? p.phone : `+${p.phone}`) : null);
    if (!code) {
      c.bump("still-unknown");
      continue;
    }
    c.bump(`set-${code}`);
    if (!DRY_RUN) {
      await prisma.patientProfile.update({
        where: { id: p.id },
        data: { countryFolderCode: code, originCountryCode: code },
      });
    }
  }

  console.log(`\nbackfill done: ${c.summary()}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
