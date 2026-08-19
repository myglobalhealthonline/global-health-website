/**
 * READ-ONLY verification of the Sara Passos do Nascimento de-duplication:
 * one patient, both appointments and both orders on the surviving account,
 * the duplicate closed off, and no row anywhere still on a stale address.
 *
 * Usage (from backend/):  npx tsx scripts/verify-sara-merge.mts
 */

import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const PRIMARY_USER = "cmsx9l4y4001h01s8nrhye35l";
const DUPLICATE_USER = "cmszx46yr008001o28rgrdxf9";
const STALE_ADDRESSES = ["sara@gmail.com", "sarah.pn@gmail.com"];

const [users, appointments, orders, mergeLog] = await Promise.all([
  prisma.user.findMany({
    where: { id: { in: [PRIMARY_USER, DUPLICATE_USER] } },
    select: { id: true, email: true, isActive: true, tokenVersion: true },
  }),
  prisma.appointment.findMany({
    where: { userId: { in: [PRIMARY_USER, DUPLICATE_USER] } },
    select: { id: true, userId: true, email: true, scheduledAt: true, status: true },
    orderBy: { scheduledAt: "asc" },
  }),
  prisma.order.findMany({
    where: { userId: { in: [PRIMARY_USER, DUPLICATE_USER] } },
    select: { orderNumber: true, userId: true, email: true, status: true, paymentStatus: true },
    orderBy: { createdAt: "asc" },
  }),
  prisma.patientMergeLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, primaryPatientId: true, duplicatePatientId: true, reason: true, patientInformed: true, createdAt: true },
  }),
]);

console.log("── ACCOUNTS ───────────────────────────────────────────");
for (const u of users) {
  const role = u.id === PRIMARY_USER ? "surviving" : "duplicate";
  console.log(`${role.padEnd(10)} ${u.email.padEnd(24)} active=${u.isActive} tokenVersion=${u.tokenVersion}`);
}

console.log("\n── APPOINTMENTS ───────────────────────────────────────");
for (const a of appointments) {
  console.log(
    `${a.scheduledAt?.toISOString() ?? "-"}  ${a.status.padEnd(18)} ${a.email.padEnd(24)} ${a.userId === PRIMARY_USER ? "surviving" : "DUPLICATE"}`,
  );
}

console.log("\n── ORDERS ─────────────────────────────────────────────");
for (const o of orders) {
  console.log(
    `${o.orderNumber}  ${`${o.status}/${o.paymentStatus}`.padEnd(18)} ${o.email.padEnd(24)} ${o.userId === PRIMARY_USER ? "surviving" : "DUPLICATE"}`,
  );
}

console.log("\n── STALE ADDRESSES ────────────────────────────────────");
for (const address of STALE_ADDRESSES) {
  const match = { equals: address, mode: "insensitive" as const };
  const [appt, order, note, doc] = await Promise.all([
    prisma.appointment.count({ where: { email: match } }),
    prisma.order.count({ where: { email: match } }),
    prisma.medicalNote.count({ where: { patientEmail: match } }),
    prisma.generatedDocument.count({ where: { patientEmail: match } }),
  ]);
  console.log(`${address.padEnd(24)} appointments=${appt} orders=${order} notes=${note} documents=${doc}`);
}

console.log("\n── MERGE LOG ──────────────────────────────────────────");
console.log(JSON.stringify(mergeLog, null, 2));

await prisma.$disconnect();
