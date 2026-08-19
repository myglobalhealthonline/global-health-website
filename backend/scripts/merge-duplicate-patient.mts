/**
 * Merge one duplicate patient profile into the surviving one, via the same
 * `mergePatients` service the admin UI calls — so a merge run from the command
 * line and a merge run from `/admin/patients/duplicates` cannot drift apart.
 *
 * Prints both records and everything hanging off the duplicate first, then
 * prints the same view afterwards so the move can be checked row by row.
 *
 * DRY-RUN BY DEFAULT. Pass --apply to commit.
 *
 * NOTE: `mergePatients` sends the surviving patient a "your records were
 * combined" email as a fire-and-forget step. Run this where that send is
 * acceptable.
 *
 * Usage (from backend/):
 *   npx tsx scripts/merge-duplicate-patient.mts <primaryProfileId> <duplicateProfileId> <adminUserId> "<reason>"
 *   ... --apply
 */

import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { mergePatients } from "../src/modules/patient-merge/patient-merge.service.js";

const [primaryId, duplicateId, adminId, reason, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");

if (!primaryId || !duplicateId || !adminId || !reason) {
  console.error(
    'Usage: merge-duplicate-patient.mts <primaryProfileId> <duplicateProfileId> <adminUserId> "<reason>" [--apply]',
  );
  process.exit(1);
}
if (primaryId === duplicateId) {
  console.error("Primary and duplicate are the same profile.");
  process.exit(1);
}
if (reason.trim().length < 10) {
  console.error("Reason must be at least 10 characters (same rule as the admin route).");
  process.exit(1);
}

async function snapshot(profileId: string, label: string) {
  const profile = await prisma.patientProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      userId: true,
      email: true,
      fullName: true,
      globalHealthNumber: true,
      isMerged: true,
      mergedIntoPatientId: true,
    },
  });
  if (!profile) {
    console.log(`${label}: NOT FOUND (${profileId})`);
    return null;
  }
  const userId = profile.userId ?? "__none__";
  const [appointments, orders, consents, notes, documents, user] = await Promise.all([
    prisma.appointment.count({ where: { userId } }),
    prisma.order.count({ where: { userId } }),
    prisma.patientConsent.count({ where: { patientProfileId: profileId } }),
    prisma.medicalNote.count({ where: { patientEmail: { equals: profile.email, mode: "insensitive" } } }),
    prisma.generatedDocument.count({ where: { patientEmail: { equals: profile.email, mode: "insensitive" } } }),
    profile.userId
      ? prisma.user.findUnique({
          where: { id: profile.userId },
          select: { email: true, isActive: true, tokenVersion: true },
        })
      : Promise.resolve(null),
  ]);
  console.log(
    `${label}: ${profile.globalHealthNumber} ${profile.fullName} <${profile.email}>` +
      `\n    merged=${profile.isMerged}${profile.mergedIntoPatientId ? ` -> ${profile.mergedIntoPatientId}` : ""}` +
      `\n    user=${user ? `${user.email} active=${user.isActive} tokenVersion=${user.tokenVersion}` : "none"}` +
      `\n    appointments=${appointments} orders=${orders} consents=${consents} notes=${notes} documents=${documents}`,
  );
  return profile;
}

console.log("── BEFORE ─────────────────────────────────────────────");
const primary = await snapshot(primaryId, "primary  ");
const duplicate = await snapshot(duplicateId, "duplicate");

if (!primary || !duplicate) {
  await prisma.$disconnect();
  process.exit(1);
}
if (duplicate.isMerged) {
  console.error("\nDuplicate is already merged — nothing to do.");
  await prisma.$disconnect();
  process.exit(1);
}

if (!apply) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to commit.");
  await prisma.$disconnect();
  process.exit(0);
}

await mergePatients({
  primaryPatientId: primaryId,
  duplicatePatientId: duplicateId,
  adminId,
  reason,
});

console.log("\n── AFTER ──────────────────────────────────────────────");
await snapshot(primaryId, "primary  ");
await snapshot(duplicateId, "duplicate");

await prisma.$disconnect();
