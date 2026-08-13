/**
 * Corrects PatientProfile.countryFolderCode rows that are set but WRONG —
 * the complement to backfill-country-folder-code.ts, which only fills nulls
 * and never overwrites an existing value.
 *
 * Found via manual-booking.service.ts investigation (2026-08-13): manual
 * bookings never wrote countryFolderCode, so profiles that got an earlier
 * (often stale/test) folder value from backfill-country-folder-code.ts kept
 * that value forever even after a real appointment in a different country
 * was booked. Confirmed pattern: Dr. Renato Sarmento (Brazil) manual
 * bookings — 10 of 22 patients stuck on an unrelated 'ie'/'es' folder
 * despite every one of their appointments being 'br'.
 *
 * Same conservative single-country rule as the null-backfill script: only
 * corrects a profile when its non-cancelled appointments agree on exactly
 * ONE distinct countryCode that differs from the stored countryFolderCode.
 * Ambiguous (multi-country) profiles are skipped and counted, never guessed.
 *
 * Matching a profile to its appointments: by userId when linked, otherwise
 * by email (case-insensitive) — same fallback as the null-backfill script.
 *
 * Dry-run by default (prints counts + a sample of up to 15 proposed
 * corrections). Pass --apply to write, in batches.
 *
 *   node --env-file=.env --import tsx scripts/fix-mismatched-country-folder-code.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/fix-mismatched-country-folder-code.ts --apply    # writes
 */
import { prisma } from "../src/db/prisma.js";

const BATCH_SIZE = 200;
const SAMPLE_LIMIT = 15;

const APPLY = process.argv.includes("--apply");

type Sample = {
  profileId: string;
  email: string;
  from: string;
  to: string;
  via: "userId" | "email";
};

async function main() {
  let total = 0;
  let resolved = 0;
  let ambiguous = 0;
  let noAppointments = 0;
  const samples: Sample[] = [];

  let cursor: string | undefined;
  for (;;) {
    const profiles = await prisma.patientProfile.findMany({
      where: { countryFolderCode: { not: null } },
      select: { id: true, email: true, userId: true, countryFolderCode: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (profiles.length === 0) break;
    cursor = profiles[profiles.length - 1].id;
    total += profiles.length;

    for (const profile of profiles) {
      const via: "userId" | "email" = profile.userId ? "userId" : "email";
      const appts = await prisma.appointment.findMany({
        where: {
          status: { not: "CANCELLED" },
          ...(profile.userId
            ? { userId: profile.userId }
            : { email: { equals: profile.email, mode: "insensitive" }, userId: null }),
        },
        select: { countryCode: true },
        distinct: ["countryCode"],
      });

      if (appts.length === 0) {
        noAppointments++;
        continue;
      }
      if (appts.length > 1) {
        ambiguous++;
        continue;
      }

      const correct = appts[0].countryCode;
      if (!correct || correct === profile.countryFolderCode) continue;

      resolved++;
      if (samples.length < SAMPLE_LIMIT) {
        samples.push({
          profileId: profile.id,
          email: profile.email,
          from: profile.countryFolderCode!,
          to: correct,
          via,
        });
      }

      if (APPLY) {
        await prisma.patientProfile.update({
          where: { id: profile.id },
          data: { countryFolderCode: correct },
        });
      }
    }
  }

  console.log(`[fix-mismatched-country-folder-code] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`  total profiles with non-null countryFolderCode=${total}`);
  console.log(`  corrected (single distinct appointment country, differs from stored)=${resolved}`);
  console.log(`  skipped: no non-cancelled appointments=${noAppointments}`);
  console.log(`  skipped: appointments span multiple countries=${ambiguous}`);
  if (!APPLY) console.log("  (pass --apply to write)");
  console.log(`\n  sample (up to ${SAMPLE_LIMIT}):`);
  for (const s of samples) {
    console.log(`    profile=${s.profileId}  email=${s.email}  ${s.from} -> ${s.to}  via=${s.via}`);
  }
}

main().finally(() => prisma.$disconnect());
