/**
 * Roll back migration-created DOCTOR rows so load-doctors can be re-run clean
 * (e.g. after a partial/failed run). Deletes ONLY:
 *   - Doctors with a legacyMongoId (created by this migration), and
 *   - the login Users linked to them that are still mustChangePassword=true
 *     (i.e. freshly provisioned, never a pre-existing real account).
 * A pre-existing real doctor account (mustChangePassword=false) is left intact;
 * only its doctorId link is cleared when its Doctor row is removed (SetNull).
 *
 *   DRY_RUN=false node --import tsx scripts/legacy-migration/reset-doctors.ts
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { DRY_RUN } from "./lib/config.js";

async function main() {
  const doctors = await prisma.doctor.findMany({
    where: { legacyMongoId: { not: null } },
    select: { id: true, fullName: true, loginUser: { select: { id: true, mustChangePassword: true } } },
  });
  const userIdsToDelete = doctors
    .map((d) => d.loginUser)
    .filter((u): u is { id: string; mustChangePassword: boolean } => !!u && u.mustChangePassword)
    .map((u) => u.id);

  console.log(
    `${DRY_RUN ? "[dry] " : ""}would delete ${doctors.length} migration doctors + ` +
      `${userIdsToDelete.length} freshly-provisioned doctor users`,
  );
  if (DRY_RUN) return;

  if (userIdsToDelete.length) {
    // PasswordResetToken cascades on User delete.
    await prisma.user.deleteMany({ where: { id: { in: userIdsToDelete } } });
  }
  // DoctorCountry cascades on Doctor delete.
  const del = await prisma.doctor.deleteMany({ where: { legacyMongoId: { not: null } } });
  console.log(`deleted ${del.count} doctors, ${userIdsToDelete.length} users.`);
}

main()
  .catch((e) => {
    console.error("reset-doctors failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
