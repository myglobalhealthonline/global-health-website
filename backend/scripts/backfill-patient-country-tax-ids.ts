/**
 * Backfill PatientCountryTaxId from the legacy single `PatientProfile.taxIdNumber`
 * column.
 *
 * Why this is needed: until the per-country table existed, every patient's
 * fiscal number went into one column with no record of which country it belonged
 * to. For a patient seen in one market that is recoverable; for a patient seen
 * in two it is not, and guessing is how a Brazilian CPF ends up printed on an
 * Irish prescription. So this only files a number when the country is PROVEN:
 *
 *   1. the profile's own `addressCountryCode`, else
 *   2. the single distinct country across all of that patient's appointments.
 *
 * A patient with no address country AND appointments in more than one country is
 * skipped and listed — a human has to say which market the stored number belongs
 * to, and the portals now let a doctor or admin do exactly that. Skipping costs
 * a blank fiscal line on their documents; guessing costs a wrong one.
 *
 * Never overwrites an existing row. Safe to re-run.
 *
 *   DRY RUN (default):  npx tsx scripts/backfill-patient-country-tax-ids.ts
 *   APPLY:              npx tsx scripts/backfill-patient-country-tax-ids.ts --apply
 *
 * Run it through `railway run` so PHI_ENCRYPTION_KEY resolves — a local .env
 * carrying the unresolved `${{...}}` template makes phi-crypto throw by design.
 */

import { prisma } from "../src/db/prisma.js";
import { decryptPhi } from "../src/lib/crypto/phi-crypto.js";
import {
  normalizeTaxIdCountryCode,
  recordPatientCountryTaxIdIfAbsent,
} from "../src/modules/patient-profile/patient-country-tax-ids.js";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const profiles = await prisma.patientProfile.findMany({
    where: { taxIdNumber: { not: null }, anonymizedAt: null },
    select: { id: true, email: true, taxIdNumber: true, addressCountryCode: true },
  });

  let filed = 0;
  let alreadyHad = 0;
  let undecryptable = 0;
  const ambiguous: { email: string; countries: string[] }[] = [];

  for (const profile of profiles) {
    let value: string | null = null;
    try {
      value = decryptPhi(profile.taxIdNumber);
    } catch {
      undecryptable += 1;
      continue;
    }
    if (!value?.trim()) continue;

    let country = normalizeTaxIdCountryCode(profile.addressCountryCode);
    if (!country) {
      // No address country — fall back to the appointments, but only when they
      // all point at one market.
      const seen = await prisma.appointment.findMany({
        where: { patientProfileId: profile.id },
        select: { countryCode: true },
        distinct: ["countryCode"],
      });
      const countries = [
        ...new Set(
          seen
            .map((a) => normalizeTaxIdCountryCode(a.countryCode))
            .filter((c): c is string => Boolean(c)),
        ),
      ];
      if (countries.length === 1) {
        country = countries[0];
      } else {
        ambiguous.push({ email: profile.email, countries });
        continue;
      }
    }

    const existing = await prisma.patientCountryTaxId.findUnique({
      where: { patientProfileId_countryCode: { patientProfileId: profile.id, countryCode: country } },
      select: { id: true },
    });
    if (existing) {
      alreadyHad += 1;
      continue;
    }

    filed += 1;
    if (APPLY) {
      await recordPatientCountryTaxIdIfAbsent(profile.id, country, value);
    }
  }

  console.log(`${APPLY ? "APPLIED" : "DRY RUN"} — profiles with a tax id: ${profiles.length}`);
  console.log(`  filed against a proven country: ${filed}`);
  console.log(`  already had a row for that country: ${alreadyHad}`);
  console.log(`  undecryptable (key/envelope): ${undecryptable}`);
  console.log(`  skipped, country not provable: ${ambiguous.length}`);
  for (const row of ambiguous) {
    console.log(`    ${row.email} — appointments in: ${row.countries.join(", ") || "none"}`);
  }
  if (!APPLY) console.log("\nNothing written. Re-run with --apply.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
