/**
 * Re-point every stored copy of a patient's old email onto their corrected
 * address — the rows an email change made before
 * `movePatientEmailReferences` existed left stranded (appointments, orders,
 * notes, documents, membership rows).
 *
 * DRY-RUN BY DEFAULT. It prints what it would touch and exits without
 * writing. Pass --apply to commit.
 *
 * Usage (from backend/):
 *   npx tsx scripts/move-patient-email-references.mts old@x.com new@x.com
 *   npx tsx scripts/move-patient-email-references.mts old@x.com new@x.com --apply
 */

import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { movePatientEmailReferences } from "../src/modules/patient-profile/patient-email-move.js";

const [oldEmailArg, newEmailArg, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");

if (!oldEmailArg || !newEmailArg) {
  console.error("Usage: move-patient-email-references.mts <oldEmail> <newEmail> [--apply]");
  process.exit(1);
}

const oldEmail = oldEmailArg.trim();
const newEmail = newEmailArg.trim().toLowerCase();

if (oldEmail.toLowerCase() === newEmail) {
  console.error("Old and new address are the same — nothing to move.");
  process.exit(1);
}

const match = { equals: oldEmail, mode: "insensitive" as const };

// ── Who owns the new address? The move is only safe onto an account that
// actually exists, otherwise we'd be scattering rows onto an address with no
// User/PatientProfile behind it.
const target = await prisma.user.findFirst({
  where: { email: { equals: newEmail, mode: "insensitive" } },
  select: { id: true, email: true, fullName: true, role: true },
});
const targetProfile = await prisma.patientProfile.findFirst({
  where: { email: { equals: newEmail, mode: "insensitive" } },
  select: { id: true, globalHealthNumber: true, fullName: true },
});

console.log("── TARGET ─────────────────────────────────────────────");
console.log("user   :", target ? `${target.fullName} <${target.email}> (${target.role})` : "NONE");
console.log("profile:", targetProfile ? `${targetProfile.fullName} ${targetProfile.globalHealthNumber}` : "NONE");

// ── Preview every row still sitting on the old address, with the name it
// carries — a shared inbox (family bookings) legitimately holds several
// names, so this has to be eyeballed before applying.
const [appointments, orders, notes, documents, enrollments] = await Promise.all([
  prisma.appointment.findMany({
    where: { email: match },
    select: { id: true, fullName: true, userId: true, scheduledAt: true, status: true },
    orderBy: { scheduledAt: "asc" },
  }),
  prisma.order.findMany({
    where: { email: match },
    select: { id: true, orderNumber: true, fullName: true, userId: true, status: true, paymentStatus: true, totalCents: true },
    orderBy: { createdAt: "asc" },
  }),
  prisma.medicalNote.count({ where: { patientEmail: match } }),
  prisma.generatedDocument.count({ where: { patientEmail: match } }),
  prisma.membershipEnrollment.count({ where: { email: match } }),
]);

console.log("\n── ROWS ON", oldEmail, "──────────────────────────────");
console.log("appointments:");
for (const a of appointments) {
  console.log(`  ${a.id}  ${a.scheduledAt?.toISOString() ?? "-"}  ${a.status}  ${a.fullName}  user=${a.userId ?? "none"}`);
}
console.log("orders:");
for (const o of orders) {
  console.log(`  ${o.orderNumber}  ${o.status}/${o.paymentStatus}  ${(o.totalCents / 100).toFixed(2)}  ${o.fullName}  user=${o.userId ?? "none"}`);
}
console.log("medicalNotes:", notes, "| generatedDocuments:", documents, "| membershipEnrollments:", enrollments);

const distinctNames = new Set(
  [...appointments.map((a) => a.fullName), ...orders.map((o) => o.fullName)]
    .map((n) => (n ?? "").trim().toLowerCase())
    .filter(Boolean),
);
if (distinctNames.size > 1) {
  console.log(
    `\n!! ${distinctNames.size} distinct names share this address: ${[...distinctNames].join(", ")}`,
  );
  console.log("   A shared inbox books for several people. Moving it moves all of them.");
}

if (!apply) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to commit.");
  await prisma.$disconnect();
  process.exit(0);
}

const counts = await prisma.$transaction(async (tx) => {
  const moved = await movePatientEmailReferences(tx, oldEmail, newEmail);
  // Same transaction as the move so the trail can't exist without the change.
  // Recorded against the account that now owns the address, because that is
  // the record an auditor starts from when asking why these rows changed
  // address outside of any request.
  if (target) {
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "USER_UPDATED",
        entityType: "User",
        entityId: target.id,
        metadata: {
          script: "move-patient-email-references",
          emailFrom: oldEmail,
          emailTo: newEmail,
          movedEmailRefs: moved,
        },
      },
    });
  }
  return moved;
});

console.log("\n── APPLIED ────────────────────────────────────────────");
console.log(JSON.stringify(counts, null, 2));
await prisma.$disconnect();
