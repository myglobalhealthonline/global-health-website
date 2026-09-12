/**
 * Verify every PatientCountryTaxId row against its country's CHECK DIGIT.
 *
 * Format alone proves little — "1234567X" is PPS-shaped and meaningless. Every
 * identifier these markets issue carries a checksum, so a value that both looks
 * right AND checksums right is almost certainly a real number for that country,
 * and a real number for country A essentially never checksums as country B.
 * That makes this a genuine audit of the backfill rather than a restatement of
 * the rule it already applied.
 *
 * Prints counts and, for failures, the patient's EMAIL only — never the number,
 * never the name. Read-only: it writes nothing.
 *
 *   DOTENV_CONFIG_PATH=.env node -r dotenv/config --import tsx \
 *     scripts/verify-patient-country-tax-ids.ts
 *
 * The checksum algorithms are unit-tested in fiscal-check-digits.test.ts
 * against published example values — a validator nobody has checked is not
 * evidence of anything.
 */

import { prisma } from "../src/db/prisma.js";
import { decryptPhi } from "../src/lib/crypto/phi-crypto.js";
import { VALIDATORS } from "./fiscal-check-digits.js";

async function main(): Promise<void> {
  const rows = await prisma.patientCountryTaxId.findMany({
    select: {
      countryCode: true,
      taxIdNumber: true,
      patient: { select: { email: true } },
    },
    orderBy: { countryCode: "asc" },
  });

  const stats: Record<string, { pass: number; fail: number; failures: string[] }> = {};
  let undecryptable = 0;

  for (const row of rows) {
    let value: string | null = null;
    try {
      value = decryptPhi(row.taxIdNumber);
    } catch {
      undecryptable += 1;
      continue;
    }
    if (!value) {
      undecryptable += 1;
      continue;
    }
    const country = row.countryCode;
    const validator = VALIDATORS[country];
    (stats[country] ??= { pass: 0, fail: 0, failures: [] });
    // No validator for a market means "cannot confirm", not "wrong".
    if (!validator) {
      stats[country].failures.push(`${row.patient.email} (no validator for ${country})`);
      continue;
    }
    if (validator.check(value)) stats[country].pass += 1;
    else {
      stats[country].fail += 1;
      stats[country].failures.push(row.patient.email);
    }
  }

  console.log("Check-digit verification of every stored per-country fiscal number\n");
  let totalPass = 0;
  let totalFail = 0;
  for (const [country, s] of Object.entries(stats).sort()) {
    const label = VALIDATORS[country]?.name ?? "unknown";
    const total = s.pass + s.fail;
    const pct = total ? Math.round((s.pass / total) * 100) : 0;
    console.log(`  ${country} (${label}): ${s.pass}/${total} valid (${pct}%)`);
    totalPass += s.pass;
    totalFail += s.fail;
  }
  console.log(`\n  TOTAL: ${totalPass} valid, ${totalFail} failing the check digit`);
  if (undecryptable) console.log(`  ${undecryptable} undecryptable`);

  for (const [country, s] of Object.entries(stats).sort()) {
    if (s.failures.length === 0) continue;
    console.log(`\n  ${country} — did NOT pass (email only):`);
    for (const email of s.failures) console.log(`    ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
