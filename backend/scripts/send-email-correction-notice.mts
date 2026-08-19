/**
 * Tell a patient their email address on file was corrected, and give them a
 * way into the account: a fresh temporary password plus a 7-day
 * set-your-own-password link.
 *
 * Same steps as `POST /api/admin/users/:id/resend-email-correction`, for use
 * before that endpoint is deployed. The PATCH route only sends this notice as
 * a side effect of the address actually changing, so once the correction is
 * already saved there is otherwise no way to tell the patient about it.
 *
 * Credentials are re-minted rather than re-sent: the previous temporary
 * password was only ever stored as a hash, so it cannot be recovered, and any
 * earlier link may be expired. Re-minting also burns the older tokens, which
 * matters when an earlier attempt went to the wrong address.
 *
 * The set-password link is built from PUBLIC_SITE_URL — check it points at the
 * real site, not localhost, or the patient receives a link they cannot open.
 *
 * DRY-RUN BY DEFAULT. Pass --apply to send.
 *
 * Usage (from backend/):
 *   npx tsx scripts/send-email-correction-notice.mts <userId>
 *   npx tsx scripts/send-email-correction-notice.mts <userId> --apply
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/config/env.js";
import { issuePasswordResetToken } from "../src/modules/auth/auth.service.js";
import { sendEmailChangedEmail, } from "../src/lib/email/templates.js";

const [userIdArg, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");

if (!userIdArg) {
  console.error("Usage: send-email-correction-notice.mts <userId> [--apply]");
  process.exit(1);
}

const user = await prisma.user.findUnique({
  where: { id: userIdArg },
  select: {
    id: true,
    email: true,
    fullName: true,
    role: true,
    isActive: true,
    emailVerifiedAt: true,
    mustChangePassword: true,
  },
});

if (!user) {
  console.error(`No user with id ${userIdArg}`);
  process.exit(1);
}
if (user.role !== "PATIENT") {
  console.error("This notice is only for patient accounts.");
  process.exit(1);
}
if (!user.isActive) {
  console.error("Refusing to send to a deactivated account.");
  process.exit(1);
}

const siteUrl = env.PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000";
const liveTokens = await prisma.passwordResetToken.count({
  where: { userId: user.id, usedAt: null },
});

console.log("── RECIPIENT ──────────────────────────────────────────");
console.log(`${user.fullName} <${user.email}>`);
console.log(`emailVerified=${user.emailVerifiedAt ? "yes" : "no"}  mustChangePassword=${user.mustChangePassword}`);
console.log(`unused reset tokens to be burned: ${liveTokens}`);
console.log(`link host: ${siteUrl}`);

if (!siteUrl.startsWith("https://")) {
  console.error("\nPUBLIC_SITE_URL is not an https site — the patient would get an unusable link. Aborting.");
  await prisma.$disconnect();
  process.exit(1);
}

if (!apply) {
  console.log('\nWould send "Your email address has been corrected" with a fresh temp password + 7-day link.');
  console.log("DRY RUN — nothing sent. Re-run with --apply to send.");
  await prisma.$disconnect();
  process.exit(0);
}

const tempPassword = randomBytes(9).toString("base64url");
const tempPasswordHash = await bcrypt.hash(tempPassword, 12);

await prisma.user.update({
  where: { id: user.id },
  data: {
    passwordHash: tempPasswordHash,
    mustChangePassword: true,
    // The new credentials supersede the old ones, so anything riding on the
    // previous password stops working now rather than at natural expiry.
    tokenVersion: { increment: 1 },
  },
});
await prisma.passwordResetToken.updateMany({
  where: { userId: user.id, usedAt: null },
  data: { usedAt: new Date() },
});

const inviteToken = await issuePasswordResetToken(user.id, {
  ttlMinutes: 7 * 24 * 60,
  isInvite: true,
});

const result = await sendEmailChangedEmail({
  to: user.email,
  fullName: user.fullName,
  tempPassword,
  token: inviteToken,
});

await prisma.auditLog.create({
  data: {
    actorUserId: null,
    actorRole: "SYSTEM",
    action: "USER_UPDATED",
    entityType: "User",
    entityId: user.id,
    metadata: {
      script: "send-email-correction-notice",
      emailCorrectionResent: true,
      email: user.email,
      transport: result,
    },
  },
});

console.log("\n── SENT ───────────────────────────────────────────────");
console.log(JSON.stringify(result, null, 2));
console.log("Temp password is NOT logged here — it exists only in the message.");

await prisma.$disconnect();
