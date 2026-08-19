/**
 * READ-ONLY sweep for the damage the pre-fix email-change path left behind.
 *
 * Every EMAIL row in PatientContactChangeLog is an address correction that
 * moved User + PatientProfile but not the tables that store the address by
 * value. This reports, per correction, how many rows are still sitting on the
 * old address — i.e. how many patients have appointments, orders, notes or
 * documents stranded away from their own record.
 *
 * Usage (from backend/):  npx tsx scripts/audit-stranded-email-references.mts
 */

import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const changes = await prisma.patientContactChangeLog.findMany({
  where: { fieldChanged: "EMAIL" },
  select: {
    patientProfileId: true,
    globalHealthNumber: true,
    oldValue: true,
    newValue: true,
    createdAt: true,
  },
  orderBy: { createdAt: "asc" },
});

console.log(`EMAIL corrections on record: ${changes.length}\n`);

let affected = 0;
let totalRows = 0;

for (const change of changes) {
  if (!change.oldValue) continue;
  const match = { equals: change.oldValue, mode: "insensitive" as const };

  const [appointments, orders, notes, documents, enrollments] = await Promise.all([
    prisma.appointment.count({ where: { email: match } }),
    prisma.order.count({ where: { email: match } }),
    prisma.medicalNote.count({ where: { patientEmail: match } }),
    prisma.generatedDocument.count({ where: { patientEmail: match } }),
    prisma.membershipEnrollment.count({ where: { email: match } }),
  ]);

  const stranded = appointments + orders + notes + documents + enrollments;
  if (stranded === 0) continue;

  // An address is only stranded if nobody legitimately owns it any more. If a
  // separate account still uses it, these rows belong to that account and must
  // NOT be moved.
  const stillOwned = await prisma.user.findFirst({
    where: { email: match },
    select: { id: true, email: true },
  });

  affected += 1;
  totalRows += stranded;
  console.log(
    `${change.globalHealthNumber ?? change.patientProfileId}  ${change.createdAt.toISOString().slice(0, 10)}` +
      `\n  ${change.oldValue}  ->  ${change.newValue}` +
      `\n  appointments=${appointments} orders=${orders} notes=${notes} documents=${documents} memberships=${enrollments}` +
      `\n  old address still owned by an account: ${stillOwned ? `YES (${stillOwned.email}) — DO NOT MOVE` : "no — safe to move"}`,
  );
}

console.log(`\nCorrections with stranded rows: ${affected} / ${changes.length}`);
console.log(`Total stranded rows: ${totalRows}`);
if (affected > 0) {
  console.log("\nFix each safe one with:");
  console.log("  npx tsx scripts/move-patient-email-references.mts <oldEmail> <newEmail> --apply");
}

await prisma.$disconnect();
