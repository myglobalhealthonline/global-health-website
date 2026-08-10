/**
 * PHI Access Recovery Plan (docs/plans/security/phi-access-recovery-plan-2026-07-17.md)
 * Backfill `Appointment.userId` for non-cancelled appointments where it is
 * null, by resolving `Appointment.email` to a `User`.
 *
 * Why: `doctorHasTreatmentRelationship` (backend/src/lib/medical-access-guard.ts)
 * joins `Appointment.userId -> PatientProfile.userId` to decide whether a
 * doctor has a treatment relationship with a patient. Production has 61
 * non-cancelled appointments with `userId = NULL`; 42 of them (30 distinct
 * patients) belong to `PatientProfile` rows that DO have a `userId` — all
 * 2026-07-15 legacy imports, all COMPLETED. Because of the null, the guard's
 * join can never match, so those patients' treating doctors are permanently
 * locked out regardless of consent. Root cause fixed going forward in
 * backend/scripts/legacy-migration/load-appointments.ts; this script repairs
 * the rows already written.
 *
 * Resolution order (never invents/creates a user):
 *   1. PatientProfile.email (case-insensitive) -> PatientProfile.userId, when
 *      that profile exists and has a userId. This is the exact relationship
 *      the guard joins on, so it's preferred.
 *   2. Direct User.email (case-insensitive) lookup, when no profile match.
 *   Ambiguous or missing resolutions are skipped and counted, never guessed.
 *
 * Only ever writes rows where `userId` is currently null — an existing
 * userId is never overwritten. Cancelled appointments are excluded (they
 * never established a treatment relationship).
 *
 * Dry-run by default (prints counts + a sample of up to 10 rows). Pass
 * --apply to write, in batches.
 *
 *   pnpm --filter backend exec tsx scripts/relink-appointment-users.ts            # dry-run
 *   pnpm --filter backend exec tsx scripts/relink-appointment-users.ts --apply    # writes
 *
 * Run with --env-file=.env (P1000 gotcha — Prisma needs DATABASE_URL loaded
 * explicitly outside a few entrypoints).
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const BATCH_SIZE = 200;
const SAMPLE_LIMIT = 10;

const APPLY = process.argv.includes("--apply");

type Sample = { appointmentId: string; email: string; resolvedUserId: string; source: "profile" | "user" };

async function main() {
  let total = 0;
  let viaProfile = 0;
  let viaUser = 0;
  let unresolvedNoMatch = 0; // email matches neither a PatientProfile nor a User
  let unresolvedProfileNoUser = 0; // PatientProfile exists but has no userId
  let written = 0;
  const sample: Sample[] = [];
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.appointment.findMany({
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { userId: null, status: { notIn: ["CANCELLED"] } },
      select: { id: true, email: true },
    });
    if (rows.length === 0) break;

    for (const appt of rows) {
      total += 1;
      const email = appt.email.toLowerCase();

      const profile = await prisma.patientProfile.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { userId: true },
      });

      let resolvedUserId: string | null = null;
      let source: "profile" | "user" | null = null;

      if (profile) {
        if (profile.userId) {
          resolvedUserId = profile.userId;
          source = "profile";
          viaProfile += 1;
        } else {
          unresolvedProfileNoUser += 1;
        }
      } else {
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { id: true },
        });
        if (user) {
          resolvedUserId = user.id;
          source = "user";
          viaUser += 1;
        } else {
          unresolvedNoMatch += 1;
        }
      }

      if (resolvedUserId && source) {
        if (sample.length < SAMPLE_LIMIT) {
          sample.push({ appointmentId: appt.id, email: appt.email, resolvedUserId, source });
        }
        if (APPLY) {
          // Guard against a race: only write if still null.
          const result = await prisma.appointment.updateMany({
            where: { id: appt.id, userId: null },
            data: { userId: resolvedUserId },
          });
          written += result.count;
        }
      }
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH_SIZE) break;
  }

  const toWrite = viaProfile + viaUser;

  console.log(
    [
      `[relink-appointment-users] mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
      `total null-userId non-cancelled appointments=${total}`,
      `resolved via PatientProfile.email->userId=${viaProfile}`,
      `resolved via direct User.email=${viaUser}`,
      `unresolvable: profile exists but no linked userId=${unresolvedProfileNoUser}`,
      `unresolvable: no matching profile or user=${unresolvedNoMatch}`,
      `to write=${toWrite}`,
      APPLY ? `written=${written}` : `(pass --apply to write)`,
    ].join("\n  "),
  );

  if (sample.length > 0) {
    console.log(`\n  sample (up to ${SAMPLE_LIMIT}):`);
    for (const s of sample) {
      console.log(`    appt=${s.appointmentId}  email=${s.email}  userId=${s.resolvedUserId}  source=${s.source}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("[relink-appointment-users] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
