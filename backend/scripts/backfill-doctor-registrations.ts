import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

/**
 * Backfill `DoctorCountry` rows from the legacy `Doctor.imcRegistration`
 * column. Every doctor with an `imcRegistration` set gets an IE
 * registration row stamped `chamberEntity="IMC"`, `isVerified=true`,
 * `verifiedAt=NOW()`.
 *
 * Pass `--dry` to print the intended writes without touching the
 * database. Pass `--country=XX` to backfill into a non-IE country
 * (e.g. when re-running after a schema rename).
 *
 *   pnpm tsx scripts/backfill-doctor-registrations.ts --dry
 *   pnpm tsx scripts/backfill-doctor-registrations.ts
 *
 * Run AFTER the `20260522010000_doctor_dashboard_parity_phase_1`
 * migration is applied. Idempotent — re-running upserts rather than
 * duplicating, and skips rows where `registrationNumber` already
 * matches.
 */

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
const COUNTRY_CODE = (
  args.find((a) => a.startsWith("--country="))?.split("=")[1] ?? "IE"
).toUpperCase();
// Real chamber short-codes per market. Falls back to COUNTRY_CODE when
// running against a market not enumerated below — admin can edit the
// chamberEntity per row from /admin/doctors/[id] afterwards.
const CHAMBER =
  ({
    IE: "IMC",
    PT: "OM",
    ES: "OMC",
    CZ: "ČLK",
    RO: "CMR",
    BR: "CRM",
  } as Record<string, string>)[COUNTRY_CODE] ?? COUNTRY_CODE;

async function main() {
  // Country codes are stored lowercase in this DB.
  const country = await prisma.country.findFirst({
    where: { code: COUNTRY_CODE.toLowerCase() },
    select: { id: true, code: true, name: true },
  });
  if (!country) {
    throw new Error(`Country ${COUNTRY_CODE} not found — aborting.`);
  }

  // We pull the legacy column via $queryRaw so this script keeps working
  // after the column is dropped in a later migration (it will just return
  // an empty set, no crash).
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; fullName: string; imcRegistration: string | null }>
  >(
    `SELECT id, "fullName", "imcRegistration"
     FROM "Doctor"
     WHERE "imcRegistration" IS NOT NULL AND "imcRegistration" <> ''`,
  );

  console.log(
    `[backfill] ${rows.length} doctor(s) with imcRegistration set → ${country.code} (${CHAMBER})`,
  );

  let written = 0;
  let skipped = 0;

  for (const row of rows) {
    const number = row.imcRegistration?.trim();
    if (!number) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.doctorCountry.findUnique({
      where: { doctorId_countryId: { doctorId: row.id, countryId: country.id } },
      select: { id: true, registrationNumber: true, chamberEntity: true },
    });

    if (
      existing?.registrationNumber === number &&
      existing?.chamberEntity === CHAMBER
    ) {
      skipped += 1;
      console.log(`  · ${row.fullName} — already linked (${CHAMBER}: ${number}), skipping`);
      continue;
    }

    console.log(
      `  ${DRY_RUN ? "[dry]" : "  →"} ${row.fullName} ⇒ ${CHAMBER}: ${number}`,
    );

    if (DRY_RUN) {
      continue;
    }

    await prisma.doctorCountry.upsert({
      where: { doctorId_countryId: { doctorId: row.id, countryId: country.id } },
      update: {
        chamberEntity: CHAMBER,
        registrationNumber: number,
        isVerified: true,
        verifiedAt: new Date(),
      },
      create: {
        doctorId: row.id,
        countryId: country.id,
        chamberEntity: CHAMBER,
        registrationNumber: number,
        isVerified: true,
        verifiedAt: new Date(),
        active: true,
      },
    });
    written += 1;
  }

  console.log(
    `\n[backfill] done. processed=${rows.length} written=${written} skipped=${skipped} dry=${DRY_RUN}`,
  );

  if (!DRY_RUN) {
    // Verification query — re-run the same check we suggested in the run book.
    const drift = await prisma.$queryRawUnsafe<
      Array<{ fullName: string; imcRegistration: string; registrationNumber: string | null }>
    >(
      `SELECT d."fullName", d."imcRegistration", dc."registrationNumber"
       FROM "Doctor" d
       LEFT JOIN "DoctorCountry" dc
         ON dc."doctorId" = d.id AND dc."countryId" = $1
       WHERE d."imcRegistration" IS NOT NULL AND d."imcRegistration" <> ''
         AND (dc."registrationNumber" IS NULL OR dc."registrationNumber" <> d."imcRegistration")`,
      country.id,
    );

    if (drift.length > 0) {
      console.error(`\n[backfill] DRIFT — ${drift.length} doctor(s) not in sync after run:`);
      for (const r of drift) {
        console.error(`  · ${r.fullName} legacy=${r.imcRegistration} current=${r.registrationNumber}`);
      }
      process.exitCode = 1;
    } else {
      console.log(`[backfill] drift check: 0 rows — all in sync.`);
    }
  }
}

main()
  .catch((err) => {
    console.error("[backfill] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
