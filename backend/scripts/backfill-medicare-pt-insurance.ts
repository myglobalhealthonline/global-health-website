/**
 * One-off backfill: attach Medicare (PT) insurance card details to existing
 * PatientProfile rows, from a CSV of already-verified Medicare cardholders
 * (source: pt-insurance.csv, Downloads, last synced 2026-08-06).
 *
 * Reads the CSV directly (columns: email,name,insurer_plano_de_saude,
 * insurance_plan_number,numero_de_utente). Only rows whose insurer is
 * "Medicare" (case-insensitive) are touched — rows with no insurer are
 * skipped entirely, even if they carry a numero_de_utente (out of scope:
 * that's not an insurance card).
 *
 * For a matched Medicare row, sets whichever of the two identifiers is
 * present (either can be blank — e.g. plan number missing but utente
 * present, or vice versa):
 *   - insuranceProviderName = "Medicare"
 *   - insurancePolicyNumber = <insurance_plan_number>  (encrypted, if present)
 *   - utenteNumber          = <numero_de_utente>        (encrypted, if present
 *                              and not the literal "na")
 *
 * Idempotent: re-running overwrites with the same values. A profile whose
 * insurer is already set to something OTHER than Medicare is skipped and
 * reported — never silently overwritten.
 *
 * Run once:
 *   npx tsx scripts/backfill-medicare-pt-insurance.ts [csvPath]
 *   (defaults to C:\Users\nauma\Downloads\pt-insurance.csv)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/db/prisma.js";
import { encryptPhi } from "../src/lib/crypto/phi-crypto.js";
import { VerificationStatus } from "@prisma/client";

const CSV_PATH = process.argv[2] ?? "C:\\Users\\nauma\\Downloads\\pt-insurance.csv";

type Row = { email: string; planNumber: string | null; utenteNumber: string | null };

function parseCsv(path: string): Row[] {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: Row[] = [];
  // Skip header (line 0).
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const email = cols[0]?.trim().toLowerCase();
    const insurer = cols[2]?.trim().toLowerCase();
    if (!email || insurer !== "medicare") continue;
    const planRaw = cols[3]?.trim().replace(/^'/, "") ?? "";
    const utenteRaw = cols[4]?.trim() ?? "";
    rows.push({
      email,
      planNumber: planRaw && planRaw.toLowerCase() !== "na" ? planRaw : null,
      utenteNumber: utenteRaw && utenteRaw.toLowerCase() !== "na" ? utenteRaw : null,
    });
  }
  return rows;
}

async function main(): Promise<void> {
  const rows = parseCsv(CSV_PATH);
  console.log(`[backfill-medicare-pt-insurance] ${rows.length} Medicare row(s) in CSV.`);

  let updated = 0;
  let noProfile = 0;
  let conflicting = 0;

  for (const row of rows) {
    const profile = await prisma.patientProfile.findUnique({
      where: { email: row.email },
      select: { id: true, insuranceProviderName: true },
    });

    if (!profile) {
      console.warn(`[skip] no PatientProfile for ${row.email}`);
      noProfile += 1;
      continue;
    }
    if (profile.insuranceProviderName && profile.insuranceProviderName !== "Medicare") {
      console.warn(
        `[skip] ${row.email} already has insurer "${profile.insuranceProviderName}" set — not overwriting`,
      );
      conflicting += 1;
      continue;
    }

    await prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        insuranceProviderName: "Medicare",
        insuranceDocumentStatus: VerificationStatus.VERIFIED,
        ...(row.planNumber ? { insurancePolicyNumber: encryptPhi(row.planNumber) } : {}),
        ...(row.utenteNumber ? { utenteNumber: encryptPhi(row.utenteNumber) } : {}),
      },
    });
    updated += 1;
  }

  console.log(
    `[backfill-medicare-pt-insurance] updated ${updated}, no profile ${noProfile}, conflicting insurer ${conflicting}.`,
  );
}

main()
  .catch((err) => {
    console.error("[backfill-medicare-pt-insurance] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
