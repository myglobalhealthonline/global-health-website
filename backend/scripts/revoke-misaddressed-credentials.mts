/**
 * Revoke the login credentials of an account whose welcome / email-corrected
 * notice was sent to the WRONG address.
 *
 * The notice carries a plaintext temporary password and a 7-day set-password
 * link. When it goes to a mistyped address, whoever owns that inbox can log in
 * and read the patient's record. Burning the reset tokens alone is not enough —
 * the temporary password in the message body still works — so this also rotates
 * the password hash to an unguessable value and bumps `tokenVersion` so any
 * session already opened on the old credentials is rejected on its next
 * request.
 *
 * The account is left ACTIVE: the patient's own appointment and order still
 * hang off it, and deactivating before those are re-pointed would hide them
 * from the admin views. Access is what gets cut here, not the record.
 *
 * DRY-RUN BY DEFAULT. Pass --apply to commit.
 *
 * Usage (from backend/):
 *   npx tsx scripts/revoke-misaddressed-credentials.mts <userId> "<reason>"
 *   npx tsx scripts/revoke-misaddressed-credentials.mts <userId> "<reason>" --apply
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/db/prisma.js";

const [userIdArg, reasonArg, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");

if (!userIdArg || !reasonArg) {
  console.error(
    'Usage: revoke-misaddressed-credentials.mts <userId> "<reason>" [--apply]',
  );
  process.exit(1);
}

const user = await prisma.user.findUnique({
  where: { id: userIdArg },
  select: { id: true, email: true, fullName: true, role: true, isActive: true, tokenVersion: true },
});

if (!user) {
  console.error(`No user with id ${userIdArg}`);
  process.exit(1);
}

const liveTokens = await prisma.passwordResetToken.count({
  where: { userId: user.id, usedAt: null },
});

console.log("── TARGET ─────────────────────────────────────────────");
console.log(`${user.fullName} <${user.email}>  ${user.role}  active=${user.isActive}`);
console.log(`unused reset tokens: ${liveTokens}  |  tokenVersion: ${user.tokenVersion}`);
console.log(`reason: ${reasonArg}`);

if (!apply) {
  console.log("\nWould burn those tokens, rotate the password hash and bump tokenVersion.");
  console.log("DRY RUN — nothing written. Re-run with --apply to commit.");
  await prisma.$disconnect();
  process.exit(0);
}

// Random, never disclosed to anyone. The account can only be re-entered by an
// admin issuing a fresh invite to a verified address.
const unusableHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

const result = await prisma.$transaction(async (tx) => {
  const burned = await tx.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const updated = await tx.user.update({
    where: { id: user.id },
    data: {
      passwordHash: unusableHash,
      mustChangePassword: true,
      tokenVersion: { increment: 1 },
    },
    select: { email: true, tokenVersion: true },
  });
  await tx.auditLog.create({
    data: {
      actorUserId: null,
      actorRole: "SYSTEM",
      action: "USER_PASSWORD_RESET",
      entityType: "User",
      entityId: user.id,
      metadata: {
        script: "revoke-misaddressed-credentials",
        reason: reasonArg,
        tokensBurned: burned.count,
      },
    },
  });
  return { tokensBurned: burned.count, ...updated };
});

console.log("\n── APPLIED ────────────────────────────────────────────");
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
