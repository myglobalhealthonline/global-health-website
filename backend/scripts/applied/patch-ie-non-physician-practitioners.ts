/**
 * APPLIED 2026-08-19 — both doctors flagged. Re-running is a no-op.
 *
 * Mark the two Irish roster members who are NOT registered physicians, so the
 * public indexability gate stops demanding a medical-council registration they
 * will never have:
 *
 *   roney-carli          — Manual Therapist
 *   priscila-figueiredo  — Rehabilitation & Wellness Consultant
 *
 * Sets `editorialChecklist.nonPhysician = true`, merged over the existing JSON
 * so `readyToIndex` and the migration marker are preserved. Read by
 * `validatePublicDoctorRecord` (waives the credential rule ONLY) and by
 * `physicianJsonLd` (emits `Person` instead of `Physician`, and drops
 * `medicalSpecialty` — asserting a medical type for a non-medical practitioner
 * would be a false credential claim).
 *
 *   node --env-file=.env --import tsx scripts/applied/patch-ie-non-physician-practitioners.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/applied/patch-ie-non-physician-practitioners.ts --apply   # write
 *
 * SAFE BY DESIGN: only the two slugs below, only within Ireland, only the one
 * JSON key. Every other checklist key is carried through untouched, and a
 * doctor already flagged is reported as already-set and skipped. Bio depth and
 * `readyToIndex` still gate indexing — this script does not make a thin profile
 * indexable.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const SLUGS = ["roney-carli", "priscila-figueiredo"];
const BIO_MIN_CHARS = 120;
const APPLY = process.argv.includes("--apply");

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);

  let changed = 0;
  for (const slug of SLUGS) {
    const doctor = await prisma.doctor.findFirst({
      where: { countryId: country.id, slug },
      select: { id: true, slug: true, fullName: true, title: true, bio: true, editorialChecklist: true },
    });
    if (!doctor) {
      console.log(`⚠ ${slug}: no doctor row in ${COUNTRY_CODE} — skipped.`);
      continue;
    }

    const checklist =
      doctor.editorialChecklist && typeof doctor.editorialChecklist === "object"
        ? (doctor.editorialChecklist as Record<string, unknown>)
        : {};

    if (checklist.nonPhysician === true) {
      console.log(`${slug}: nonPhysician already true — skipped.`);
    } else {
      changed += 1;
      console.log(
        `${APPLY ? "SET" : "WOULD SET"} nonPhysician=true: ${slug} (${doctor.fullName} — ${doctor.title})`,
      );
      if (APPLY) {
        await prisma.doctor.update({
          where: { id: doctor.id },
          data: {
            editorialChecklist: { ...checklist, nonPhysician: true } as Prisma.InputJsonValue,
          },
        });
      }
    }

    // The flag waives the credential rule only — say plainly whether this
    // profile now clears the gate or is still held back by its bio.
    const bioLen = (doctor.bio ?? "").trim().length;
    console.log(
      bioLen >= BIO_MIN_CHARS
        ? `  bio ${bioLen} chars — clears the ${BIO_MIN_CHARS}-char floor, profile will index.`
        : `  bio ${bioLen} chars — STILL BELOW the ${BIO_MIN_CHARS}-char floor, profile stays noindex until the bio is written.`,
    );
  }

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${changed} doctor(s) flagged nonPhysician.`
      : `DRY-RUN: ${changed} doctor(s) would be flagged. Pass --apply to persist.`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
