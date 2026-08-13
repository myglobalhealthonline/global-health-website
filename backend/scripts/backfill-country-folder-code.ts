/**
 * PHI Access Recovery Plan (docs/plans/security/phi-access-recovery-plan-2026-07-17.md)
 * Backfill `PatientProfile.countryFolderCode` where it is null.
 *
 * Why: `assertMedicalAccess`'s country-clinic consent tier (4d in
 * backend/src/lib/medical-access-guard.ts) only fires when
 * `resource.patientCountryFolder` (= `PatientProfile.countryFolderCode`,
 * read in backend/src/utils/guard-medical-read.ts:120/149) is non-null AND
 * matches the doctor's `Country.code`. Production has 194 of 1426
 * PatientProfile rows with `countryFolderCode = null`, which disables that
 * access tier for them entirely regardless of consent.
 *
 * Value source: the patient's own non-cancelled `Appointment.countryCode`.
 * That column is already stored in the same `Country.code` format the guard
 * compares against (booking writes `input.country`, resolved from
 * `Country.code` — see createAppointmentWithOptionalOwner), so no
 * transformation is needed, only picking which appointment wins.
 *
 * Matching a profile to its appointments: by `PatientProfile.userId ->
 * Appointment.userId` when the profile has a linked account; otherwise by
 * email (case-insensitive), the same fallback `guardMedicalReadForAppointment`
 * uses for guest bookings.
 *
 * Deterministic rule: if the patient's non-cancelled appointments span more
 * than one distinct countryCode, this is ambiguous — skip and count it
 * rather than guessing which clinic folder they belong to. Only a single
 * distinct countryCode across all their appointments is written.
 *
 * Never overwrites an existing countryFolderCode. Dry-run by default (prints
 * counts + a sample of up to 10 proposed values). Pass --apply to write, in
 * batches.
 *
 *   pnpm --filter backend exec tsx scripts/backfill-country-folder-code.ts            # dry-run
 *   pnpm --filter backend exec tsx scripts/backfill-country-folder-code.ts --apply    # writes
 *
 * Run with --env-file=.env (P1000 gotcha — Prisma needs DATABASE_URL loaded
 * explicitly outside a few entrypoints).
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const BATCH_SIZE = 200;
const SAMPLE_LIMIT = 10;

const APPLY = process.argv.includes("--apply");

type Sample = { profileId: string; email: string; countryFolderCode: string; via: "userId" | "email" };

async function main() {
  let total = 0;
  let noAppointments = 0;
  let ambiguousMultiCountry = 0;
  let resolved = 0;
  let written = 0;
  const sample: Sample[] = [];
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { countryFolderCode: null },
      select: { id: true, email: true, userId: true },
    });
    if (rows.length === 0) break;

    for (const profile of rows) {
      total += 1;

      const appts = profile.userId
        ? await prisma.appointment.findMany({
            where: { userId: profile.userId, status: { notIn: ["CANCELLED"] } },
            select: { countryCode: true },
          })
        : await prisma.appointment.findMany({
            where: {
              email: { equals: profile.email, mode: "insensitive" },
              status: { notIn: ["CANCELLED"] },
            },
            select: { countryCode: true },
          });

      const distinctCountries = new Set(appts.map((a) => a.countryCode));

      if (distinctCountries.size === 0) {
        noAppointments += 1;
        continue;
      }
      if (distinctCountries.size > 1) {
        ambiguousMultiCountry += 1;
        continue;
      }

      const countryFolderCode = [...distinctCountries][0];
      resolved += 1;
      if (sample.length < SAMPLE_LIMIT) {
        sample.push({
          profileId: profile.id,
          email: profile.email,
          countryFolderCode,
          via: profile.userId ? "userId" : "email",
        });
      }
      if (APPLY) {
        // Guard against a race: only write if still null.
        const result = await prisma.patientProfile.updateMany({
          where: { id: profile.id, countryFolderCode: null },
          data: { countryFolderCode },
        });
        written += result.count;
      }
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH_SIZE) break;
  }

  console.log(
    [
      `[backfill-country-folder-code] mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
      `total profiles with null countryFolderCode=${total}`,
      `resolved (single distinct appointment country)=${resolved}`,
      `unresolvable: no non-cancelled appointments=${noAppointments}`,
      `unresolvable: appointments span multiple countries=${ambiguousMultiCountry}`,
      APPLY ? `written=${written}` : `(pass --apply to write)`,
    ].join("\n  "),
  );

  if (sample.length > 0) {
    console.log(`\n  sample (up to ${SAMPLE_LIMIT}):`);
    for (const s of sample) {
      console.log(
        `    profile=${s.profileId}  email=${s.email}  countryFolderCode=${s.countryFolderCode}  via=${s.via}`,
      );
    }
  }
}

main()
  .catch((err) => {
    console.error("[backfill-country-folder-code] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
