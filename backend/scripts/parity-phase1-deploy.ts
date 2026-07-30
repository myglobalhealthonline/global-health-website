import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

/**
 * End-to-end runner for the doctor-dashboard parity Phase 1 deploy. Walks
 * through every deploy-time gate listed in §15 of
 * `docs/plans/doctor-dashboard-parity-plan.md`:
 *
 *   1. DB connectivity probe
 *   2. Schema-level verification — the new columns exist (i.e. the
 *      additive migration has been applied)
 *   3. Pre-backfill count of legacy `Doctor.imcRegistration` rows
 *   4. Dry-run backfill — prints intended writes, no DB changes
 *   5. Real backfill — driven by `--apply`
 *   6. Drift check — re-runs the SQL the backfill script also runs,
 *      exits 1 if any row still mismatches
 *   7. PDF regression sample — re-fetches per-country registration for
 *      up to 3 IE doctors and prints what the PDF header would render
 *
 *   pnpm tsx scripts/parity-phase1-deploy.ts             # dry-run only
 *   pnpm tsx scripts/parity-phase1-deploy.ts --apply     # full deploy
 *
 * The script is idempotent — running it after a successful apply still
 * works (counts match, drift = 0). Safe to wire into a Railway
 * post-deploy hook.
 */

const APPLY = process.argv.includes("--apply");
const COUNTRY_CODE = (
  process.argv.find((a) => a.startsWith("--country="))?.split("=")[1] ?? "IE"
).toUpperCase();
// Real chamber short-codes per market. The fallback to COUNTRY_CODE keeps
// the script useful for new markets we haven't enumerated here yet —
// admin can edit the row's chamberEntity in /admin/doctors/[id] later.
const CHAMBER =
  ({
    IE: "IMC",
    PT: "OM",
    ES: "OMC",
    CZ: "ČLK",
    RO: "CMR",
    BR: "CRM",
  } as Record<string, string>)[COUNTRY_CODE] ?? COUNTRY_CODE;

type StepResult = { name: string; ok: boolean; detail: string };
const steps: StepResult[] = [];

function record(name: string, ok: boolean, detail: string): void {
  steps.push({ name, ok, detail });
  const icon = ok ? "✓" : "✗";
  console.log(`[${icon}] ${name} — ${detail}`);
}

async function probeConnectivity(): Promise<void> {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    record("DB connectivity", true, "Postgres reachable");
  } catch (err) {
    record(
      "DB connectivity",
      false,
      `Postgres not reachable: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  }
}

async function checkSchemaApplied(): Promise<void> {
  const expectedColumns: Array<[string, string]> = [
    ["Doctor", "canCreateManualAppointments"],
    ["DoctorCountry", "chamberEntity"],
    ["DoctorCountry", "registrationNumber"],
    ["DoctorCountry", "isVerified"],
    ["PatientProfile", "nationalIdNumber"],
    ["PatientProfile", "statusAlert"],
    ["PatientProfile", "pricingPlanId"],
    ["Appointment", "clinicId"],
    ["Appointment", "locationAddress"],
    ["BookingSetting", "requireNationalId"],
  ];
  for (const [table, column] of expectedColumns) {
    const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2`,
      table,
      column,
    );
    if (rows.length === 0) {
      record(
        "Schema check",
        false,
        `Missing column ${table}.${column} — run prisma migrate deploy first`,
      );
      throw new Error(`Missing column ${table}.${column}`);
    }
  }
  record("Schema check", true, `${expectedColumns.length} expected columns all present`);
}

async function preBackfillCount(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count
     FROM "Doctor"
     WHERE "imcRegistration" IS NOT NULL AND "imcRegistration" <> ''`,
  );
  const n = Number(rows[0]?.count ?? 0n);
  record("Pre-backfill count", true, `${n} doctor(s) with legacy imcRegistration set`);
  return n;
}

async function postBackfillCount(country: { id: string }): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count
     FROM "DoctorCountry"
     WHERE "countryId" = $1
       AND "chamberEntity" = $2
       AND "registrationNumber" IS NOT NULL
       AND "registrationNumber" <> ''`,
    country.id,
    CHAMBER,
  );
  return Number(rows[0]?.count ?? 0n);
}

async function runBackfill(country: { id: string; code: string }): Promise<void> {
  const legacyRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; fullName: string; imcRegistration: string | null }>
  >(
    `SELECT id, "fullName", "imcRegistration"
     FROM "Doctor"
     WHERE "imcRegistration" IS NOT NULL AND "imcRegistration" <> ''`,
  );

  let written = 0;
  let skipped = 0;

  for (const row of legacyRows) {
    const number = row.imcRegistration?.trim();
    if (!number) {
      skipped += 1;
      continue;
    }
    const existing = await prisma.doctorCountry.findUnique({
      where: { doctorId_countryId: { doctorId: row.id, countryId: country.id } },
      select: { registrationNumber: true, chamberEntity: true },
    });
    if (existing?.registrationNumber === number && existing?.chamberEntity === CHAMBER) {
      skipped += 1;
      continue;
    }
    if (!APPLY) {
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

  record(
    APPLY ? "Backfill (apply)" : "Backfill (dry-run)",
    true,
    APPLY
      ? `written=${written} skipped=${skipped}`
      : `would-write=${legacyRows.length - skipped} already-in-sync=${skipped}`,
  );
}

async function driftCheck(country: { id: string }): Promise<void> {
  const drift = await prisma.$queryRawUnsafe<
    Array<{
      fullName: string;
      imcRegistration: string;
      registrationNumber: string | null;
    }>
  >(
    `SELECT d."fullName", d."imcRegistration", dc."registrationNumber"
     FROM "Doctor" d
     LEFT JOIN "DoctorCountry" dc
       ON dc."doctorId" = d.id AND dc."countryId" = $1
     WHERE d."imcRegistration" IS NOT NULL AND d."imcRegistration" <> ''
       AND (dc."registrationNumber" IS NULL
            OR dc."registrationNumber" <> d."imcRegistration")`,
    country.id,
  );
  if (drift.length === 0) {
    record("Drift check", true, "0 rows out of sync — backfill complete");
    return;
  }
  record("Drift check", false, `${drift.length} doctor(s) out of sync`);
  for (const r of drift) {
    console.error(`    · ${r.fullName} legacy=${r.imcRegistration} current=${r.registrationNumber ?? "(missing)"}`);
  }
  throw new Error("Drift check failed");
}

async function pdfRegressionSample(country: { id: string; code: string }): Promise<void> {
  const sample = await prisma.doctor.findMany({
    where: {
      countryId: country.id,
      additionalCountries: { some: {} },
    },
    take: 3,
    select: {
      id: true,
      fullName: true,
      imcRegistration: true,
      additionalCountries: {
        where: { countryId: country.id },
        select: {
          chamberEntity: true,
          registrationNumber: true,
          isVerified: true,
        },
      },
    },
  });
  if (sample.length === 0) {
    record(
      "PDF regression sample",
      true,
      `No ${country.code} doctors with linked-country rows yet — skipping; legacy reads still work`,
    );
    return;
  }
  for (const d of sample) {
    const linked = d.additionalCountries[0];
    const renderedFromNew = linked?.registrationNumber
      ? `${linked.chamberEntity}: ${linked.registrationNumber}${linked.isVerified ? "" : " (unverified)"}`
      : "(missing)";
    console.log(
      `    · ${d.fullName} — legacy="${d.imcRegistration ?? ""}" new="${renderedFromNew}"`,
    );
  }
  record(
    "PDF regression sample",
    true,
    `Compared ${sample.length} doctor(s); manually verify the headers match expected output`,
  );
}

async function main(): Promise<void> {
  console.log(
    `[parity-deploy] mode=${APPLY ? "APPLY" : "DRY-RUN"} country=${COUNTRY_CODE} chamber=${CHAMBER}`,
  );
  console.log("");

  await probeConnectivity();
  await checkSchemaApplied();

  // Country codes are stored lowercase in this DB (`ie`, `pt`, etc.).
  // The CLI flag uppercases for the chamber lookup table; convert to
  // lowercase here for the row lookup.
  const country = await prisma.country.findFirst({
    where: { code: COUNTRY_CODE.toLowerCase() },
    select: { id: true, code: true, name: true },
  });
  if (!country) {
    throw new Error(`Country ${COUNTRY_CODE} not found in database`);
  }

  const pre = await preBackfillCount();
  await runBackfill(country);
  const post = await postBackfillCount(country);
  record(
    "Post-backfill count",
    APPLY ? post >= pre : true,
    APPLY
      ? `${post} DoctorCountry row(s) match (expected ≥ ${pre})`
      : `${post} already in place (dry-run does not change this)`,
  );

  await driftCheck(country);
  await pdfRegressionSample(country);

  console.log("");
  console.log(
    "[parity-deploy] all steps green. " +
      (APPLY
        ? "Phase 1 verified — see pending-migrations/20260523_drop_legacy_imcRegistration when ready."
        : "Re-run with --apply to commit the backfill."),
  );
}

main()
  .catch((err) => {
    console.error("");
    console.error("[parity-deploy] failed:", err instanceof Error ? err.message : err);
    console.error("");
    console.error("Step results:");
    for (const s of steps) {
      console.error(`  ${s.ok ? "✓" : "✗"} ${s.name} — ${s.detail}`);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
