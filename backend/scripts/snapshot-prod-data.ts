import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/db/prisma.js";

/**
 * Logical, JSON-based snapshot of the tables Phase 1 touches. NOT a
 * full pg_dump — schema lives in source under prisma/migrations, so we
 * only need the DATA for the rows the parity work could touch:
 * Doctor / DoctorCountry / PatientProfile / Appointment / BookingSetting
 * / Clinic / Country / AuditLog.
 *
 * Writes to `backups/prod-data-<YYYY-MM-DD-HHMMSS>.json` (gitignored).
 * Use as a "before" reference if you need to spot-check what changed
 * post-deploy.
 */

const TABLES = [
  "doctor",
  "doctorCountry",
  "patientProfile",
  "appointment",
  "bookingSetting",
  "clinic",
  "country",
  "auditLog",
] as const;

(async () => {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const outPath = path.resolve(
    __dirname,
    `../../backups/prod-data-${stamp}.json`,
  );
  mkdirSync(path.dirname(outPath), { recursive: true });

  const snapshot: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any)[t].findMany();
    snapshot[t] = rows;
    console.log(`  ${t}: ${rows.length} row(s)`);
  }

  writeFileSync(
    outPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        purpose: "Phase 1 deploy reference snapshot",
        tables: snapshot,
      },
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );

  console.log(`\nSnapshot → ${path.relative(process.cwd(), outPath)}`);
  await prisma.$disconnect();
})();
