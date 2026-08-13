import { join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: join(__dirname, "..", ".env") });

/**
 * Print a portal set-password (invite) link for an existing account.
 *
 *   node --import tsx scripts/issue-portal-invite.ts patient@example.com
 *   node --import tsx scripts/issue-portal-invite.ts patient@example.com --days 14
 *
 * For accounts that exist but have never had a usable password — a legacy
 * import, an admin-created booking — where the normal "forgot password" mail
 * would work but we want to hand the person a link directly.
 *
 * Issues an INVITE token (same as the patient-create flow): consuming it sets
 * their chosen password, marks the email verified (clicking the link proves
 * mailbox control) and clears mustChangePassword. Default TTL 7 days, versus
 * 1 hour for a plain forgot-password token.
 *
 * The link IS the credential — anyone holding it can set the password. Send it
 * to the account's own address and nowhere else. Prints only; sends nothing.
 */

const log = (msg: string): void => console.log(`[invite] ${msg}`);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  if (!email) {
    throw new Error("usage: issue-portal-invite.ts <email> [--days N]");
  }
  const daysArg = args.indexOf("--days");
  const days = daysArg >= 0 ? Number(args[daysArg + 1]) : 7;
  if (!Number.isFinite(days) || days <= 0 || days > 30) {
    throw new Error("--days must be between 1 and 30");
  }

  const { prisma } = await import("../src/db/prisma.js");
  const { issuePasswordResetToken } = await import("../src/modules/auth/auth.service.js");
  const { absoluteSiteUrl } = await import("../src/lib/email/send-email.js");
  const { recordAudit } = await import("../src/modules/audit/audit.service.js");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, emailVerifiedAt: true },
  });
  if (!user) throw new Error(`no account for ${email} — create the patient first`);
  if (!user.isActive) throw new Error(`account ${email} is deactivated — reactivate before inviting`);

  // Burn any outstanding unused tokens. Two live set-password links for one
  // account means an older mail (or a forwarded one) can still take it over
  // after the person has set their password from the newest link.
  const burned = await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (burned.count > 0) log(`invalidated ${burned.count} outstanding token(s)`);

  const token = await issuePasswordResetToken(user.id, {
    ttlMinutes: days * 24 * 60,
    isInvite: true,
  });
  const url = absoluteSiteUrl(`/reset-password?token=${encodeURIComponent(token)}&invite=1`);

  await recordAudit({
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    actorUserId: null,
    metadata: { via: "issue-portal-invite script", ttlDays: days },
  });

  log(`${user.fullName ?? "(no name)"} <${user.email}> · role ${user.role}`);
  log(`email verified: ${user.emailVerifiedAt ? "yes" : "no"}`);
  log(`expires in ${days} day(s)`);
  log("");
  log("SET-PASSWORD LINK (send to the account's own address only):");
  log(url);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
