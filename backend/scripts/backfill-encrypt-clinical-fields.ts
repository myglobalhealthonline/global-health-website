/**
 * One-time backfill: encrypt existing plaintext clinical data —
 * PatientProfile.{bloodType, allergies, chronicDiseases, familyHistory,
 * usualMedication, medicalNotes (legacy Json)} and MedicalNote.content —
 * once PHI_ENCRYPTION_KEY has been set. Mirrors scripts/encrypt-phi-backfill.ts.
 *
 *   PHI_ENCRYPTION_KEY=<key> pnpm --filter backend ts scripts/backfill-encrypt-clinical-fields.ts
 *   PHI_ENCRYPTION_KEY=<key> pnpm --filter backend ts scripts/backfill-encrypt-clinical-fields.ts --dry-run
 *
 * Idempotent: values already in the `phi:v1:` envelope are skipped, so it is
 * safe to re-run. Batched at 200 rows. --dry-run prints counts only, no writes.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import {
  encryptPhi,
  isPhiEncryptionEnabled,
  CLINICAL_ENCRYPTED_FIELDS,
  CLINICAL_ARRAY_FIELDS,
} from "../src/lib/crypto/phi-crypto.js";

const BATCH_SIZE = 200;
const DRY_RUN = process.argv.includes("--dry-run");
const ENVELOPE_PREFIX = "phi:v1:";

function needsEncryption(v: string): boolean {
  return v.length > 0 && !v.startsWith(ENVELOPE_PREFIX);
}

async function backfillPatientProfiles() {
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;

  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        bloodType: true,
        allergies: true,
        chronicDiseases: true,
        familyHistory: true,
        usualMedication: true,
        medicalNotes: true,
      },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      const data: Record<string, unknown> = {};

      for (const field of CLINICAL_ENCRYPTED_FIELDS) {
        const current = row[field];
        if (current && needsEncryption(current)) {
          data[field] = encryptPhi(current);
        }
      }
      for (const field of CLINICAL_ARRAY_FIELDS) {
        const current = row[field];
        if (current.length && current.some(needsEncryption)) {
          data[field] = current.map((v) => (needsEncryption(v) ? encryptPhi(v) : v));
        }
      }
      // Legacy Json column (patients_*.medicalNotes[] import artifact, not
      // read/written by any live code path — ponytail: encrypt defensively
      // for at-rest safety, no live wiring since nothing reads it).
      if (Array.isArray(row.medicalNotes) && row.medicalNotes.length) {
        let changed = false;
        const notes = (row.medicalNotes as Array<Record<string, unknown>>).map((note) => {
          const content = note?.content;
          if (typeof content === "string" && needsEncryption(content)) {
            changed = true;
            return { ...note, content: encryptPhi(content) };
          }
          return note;
        });
        if (changed) data.medicalNotes = notes;
      }

      if (Object.keys(data).length > 0) {
        updated += 1;
        if (!DRY_RUN) {
          await prisma.patientProfile.update({ where: { id: row.id }, data });
        }
      }
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH_SIZE) break;
  }

  return { scanned, updated };
}

async function backfillMedicalNotes() {
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;

  for (;;) {
    const rows = await prisma.medicalNote.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, content: true },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      if (needsEncryption(row.content)) {
        updated += 1;
        if (!DRY_RUN) {
          await prisma.medicalNote.update({
            where: { id: row.id },
            data: { content: encryptPhi(row.content)! },
          });
        }
      }
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH_SIZE) break;
  }

  return { scanned, updated };
}

async function main() {
  if (!isPhiEncryptionEnabled()) {
    throw new Error(
      "PHI_ENCRYPTION_KEY is not set — refusing to run (would be a no-op).",
    );
  }

  const profiles = await backfillPatientProfiles();
  const notes = await backfillMedicalNotes();

  console.log(
    `${DRY_RUN ? "[dry-run] " : ""}PatientProfile: ${profiles.updated}/${profiles.scanned} row(s) ${DRY_RUN ? "would be " : ""}encrypted.`,
  );
  console.log(
    `${DRY_RUN ? "[dry-run] " : ""}MedicalNote: ${notes.updated}/${notes.scanned} row(s) ${DRY_RUN ? "would be " : ""}encrypted.`,
  );
}

main()
  .catch((err) => {
    console.error("Clinical-field backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
