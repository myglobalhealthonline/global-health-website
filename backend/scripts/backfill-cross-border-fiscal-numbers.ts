/**
 * File the fiscal numbers patients typed at the CROSS-BORDER payment step into
 * PatientCountryTaxId.
 *
 * When Doctor A asks Doctor B to prescribe into another country, the patient is
 * asked at the payment step for the identifier valid in THAT country — a PPS for
 * an Irish prescription, even though the patient's chart is Brazilian. That
 * answer was stored on `CrossBorderPrescriptionRequest.patientHealthIdNumber`
 * and snapshotted onto the async appointment, and it reaches the generated
 * document from there. It never reached the patient's record, so the portals
 * showed "not on file" for a country whose documents were printing a number —
 * and the patient was asked for it again on their next request.
 *
 * These are the genuine two-country patients: a Brazilian CPF on the chart and
 * an Irish PPS given for the prescription. Filing them is what makes the
 * per-country table reflect reality rather than just the one legacy column.
 *
 * The country needs no guessing here, unlike the legacy-column backfill: the
 * request records which country it was collected for. Values are still run
 * through the check digit and any failures reported, since a typo is worth
 * knowing about even when the country is certain.
 *
 * Never overwrites an existing row. Safe to re-run.
 *
 *   DRY RUN (default):
 *     DOTENV_CONFIG_PATH=.env node -r dotenv/config --import tsx \
 *       scripts/backfill-cross-border-fiscal-numbers.ts
 *   APPLY: same command with --apply
 */

import { prisma } from "../src/db/prisma.js";
import { decryptPhi } from "../src/lib/crypto/phi-crypto.js";
import {
  normalizeTaxIdCountryCode,
  recordPatientCountryTaxIdIfAbsent,
} from "../src/modules/patient-profile/patient-country-tax-ids.js";
import { VALIDATORS } from "./fiscal-check-digits.js";

const APPLY = process.argv.includes("--apply");

function safeDecrypt(value: string | null | undefined): string | null {
  try {
    return decryptPhi(value ?? null);
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const requests = await prisma.crossBorderPrescriptionRequest.findMany({
    select: {
      id: true,
      targetCountryCode: true,
      patientEmail: true,
      patientHealthIdNumber: true,
      asyncAppointmentId: true,
      createdAt: true,
    },
    // Oldest first: if a patient answered twice for the same country, the
    // EARLIEST is filed and later ones are skipped as duplicates, matching the
    // never-overwrite rule the live path uses.
    orderBy: { createdAt: "asc" },
  });

  let filed = 0;
  let alreadyHad = 0;
  let noProfile = 0;
  let noValue = 0;
  const checkDigitFailures: { email: string; country: string }[] = [];

  for (const request of requests) {
    const value = safeDecrypt(request.patientHealthIdNumber)?.trim();
    if (!value) {
      noValue += 1;
      continue;
    }
    const country = normalizeTaxIdCountryCode(request.targetCountryCode);
    if (!country) continue;

    // Prefer the appointment's durable patient link; fall back to the address
    // the request itself recorded.
    let patientProfileId: string | null = null;
    if (request.asyncAppointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: request.asyncAppointmentId },
        select: { patientProfileId: true },
      });
      patientProfileId = appt?.patientProfileId ?? null;
    }
    if (!patientProfileId) {
      const profile = await prisma.patientProfile.findFirst({
        where: { email: { equals: request.patientEmail, mode: "insensitive" } },
        select: { id: true },
      });
      patientProfileId = profile?.id ?? null;
    }
    if (!patientProfileId) {
      noProfile += 1;
      continue;
    }

    const validator = VALIDATORS[country];
    if (validator && !validator.check(value)) {
      checkDigitFailures.push({ email: request.patientEmail, country });
    }

    const existing = await prisma.patientCountryTaxId.findUnique({
      where: { patientProfileId_countryCode: { patientProfileId, countryCode: country } },
      select: { id: true },
    });
    if (existing) {
      alreadyHad += 1;
      continue;
    }

    if (APPLY) {
      await recordPatientCountryTaxIdIfAbsent(patientProfileId, country, value);
    }
    filed += 1;
  }

  console.log(`${APPLY ? "APPLIED" : "DRY RUN"} — cross-border requests: ${requests.length}`);
  console.log(`  filed against the target country: ${filed}`);
  console.log(`  already had a row:                ${alreadyHad}`);
  console.log(`  no health id captured:            ${noValue}`);
  console.log(`  no patient record resolved:       ${noProfile}`);
  if (checkDigitFailures.length > 0) {
    console.log(`\n  Filed but FAILS the country's check digit (likely a typo):`);
    for (const f of checkDigitFailures) console.log(`    ${f.email} — ${f.country}`);
  }
  if (!APPLY) console.log("\nNothing written. Re-run with --apply.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
