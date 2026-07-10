import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
} from "../../lib/totp.js";
import { encryptPhi, decryptPhi } from "../../lib/crypto/phi-crypto.js";
import { recordAudit } from "../audit/audit.service.js";
import { AuthInvalidCredentialsError } from "../auth/auth.service.js";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class TwoFactorNotConfiguredError extends Error {
  constructor() {
    super("Two-factor authentication is not configured for this account");
    this.name = "TwoFactorNotConfiguredError";
  }
}

export class TwoFactorTokenInvalidError extends Error {
  constructor() {
    super("The two-factor token is invalid or has expired");
    this.name = "TwoFactorTokenInvalidError";
  }
}

export class TwoFactorAlreadyEnabledError extends Error {
  constructor() {
    super("Two-factor authentication is already enabled for this account");
    this.name = "TwoFactorAlreadyEnabledError";
  }
}

// ---------------------------------------------------------------------------
// Setup flow — step 1: generate secret + QR URI (nothing saved yet)
// ---------------------------------------------------------------------------

/**
 * Initiate 2FA setup. Returns the plaintext secret, a QR URI for the
 * authenticator app, and one-time backup codes — all to be shown to the
 * user exactly once. Nothing is persisted until `confirmTwoFactor` succeeds.
 *
 * Throws `TwoFactorAlreadyEnabledError` if 2FA is already active on the
 * account so the caller can surface a clear error instead of silently
 * overwriting a live 2FA setup.
 */
export async function initiateTwoFactor(userId: string): Promise<{
  secret: string;
  qrUri: string;
  backupCodes: string[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, twoFactorEnabled: true },
  });

  if (!user) {
    throw new TwoFactorNotConfiguredError();
  }

  if (user.twoFactorEnabled) {
    throw new TwoFactorAlreadyEnabledError();
  }

  const secret = generateTotpSecret();
  const qrUri = generateTotpUri(secret, user.email);
  const backupCodes = generateBackupCodes(10);

  return { secret, qrUri, backupCodes };
}

// ---------------------------------------------------------------------------
// Setup flow — step 2: verify token + persist
// ---------------------------------------------------------------------------

/**
 * Complete 2FA setup. Verifies the provided TOTP token against the plaintext
 * secret the client received from `initiateTwoFactor`, then persists the
 * encrypted secret and hashed backup codes.
 *
 * The plaintext secret and backup codes are never stored — only their
 * encrypted/hashed forms reach the database.
 *
 * S-007a: requires the account's current password before persisting the new
 * 2FA config — an already-authenticated (possibly stolen) session must not
 * be able to silently enroll attacker-controlled 2FA. Throws
 * `AuthInvalidCredentialsError` if the password doesn't match, so the
 * caller maps it to the same 400 response `changeUserPassword`/
 * `disableTwoFactor` already use.
 *
 * Throws `TwoFactorTokenInvalidError` if the token doesn't verify so the
 * caller can prompt the user to re-scan and retry.
 */
export async function confirmTwoFactor(
  userId: string,
  currentPassword: string,
  token: string,
  plaintextSecret: string,
  plaintextBackupCodes: string[],
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, isActive: true, twoFactorEnabled: true },
  });

  if (!user || !user.isActive) {
    throw new TwoFactorNotConfiguredError();
  }

  if (user.twoFactorEnabled) {
    throw new TwoFactorAlreadyEnabledError();
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthInvalidCredentialsError();
  }

  if (!verifyTotp(plaintextSecret, token)) {
    throw new TwoFactorTokenInvalidError();
  }

  const encryptedSecret = encryptPhi(plaintextSecret) ?? plaintextSecret;
  const hashedBackupCodes = plaintextBackupCodes.map(hashBackupCode);
  const now = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: encryptedSecret,
      twoFactorBackupCodes: hashedBackupCodes,
      twoFactorVerifiedAt: now,
      twoFactorEnabledAt: now,
      // S-007b: bump tokenVersion so any other session issued before this
      // enrollment (e.g. the attacker's, if this cookie was stolen) is
      // rejected by requireAuth on its next request.
      tokenVersion: { increment: 1 },
    },
  });

  recordAudit({
    actorUserId: userId,
    actorRole: "USER",
    action: "TWO_FACTOR_ENABLED" as never,
    entityType: "User",
    entityId: userId,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Verify token during login
// ---------------------------------------------------------------------------

/**
 * Verify a 2FA token (TOTP or backup code) as part of the login flow.
 * Must be called AFTER password verification succeeds.
 *
 * - Tries TOTP first; if that fails, tries each backup code.
 * - If a backup code matches, the used hash is removed from the stored set.
 * - Emits an audit event for both success and failure paths.
 *
 * Returns `true` on success, `false` on failure. Never throws on bad tokens
 * so the route layer can handle the 401 response uniformly.
 */
export async function verifyTwoFactorLogin(
  userId: string,
  token: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return false;
  }

  const plaintextSecret = decryptPhi(user.twoFactorSecret);
  if (!plaintextSecret) {
    return false;
  }

  // --- Try TOTP ---
  if (verifyTotp(plaintextSecret, token)) {
    recordAudit({
      actorUserId: userId,
      actorRole: "USER",
      action: "TWO_FACTOR_VERIFIED" as never,
      entityType: "User",
      entityId: userId,
    }).catch(() => {});
    return true;
  }

  // --- Try backup code: atomic conditional removal (S-007c) ---
  // A single UPDATE ... WHERE <hash> = ANY(...) is applied atomically by
  // Postgres — two concurrent requests presenting the same backup code
  // can't both succeed. The second evaluates its WHERE clause against the
  // already-committed (hash-removed) row and affects zero rows. This
  // replaces the previous read-then-write (TOCTOU) pattern.
  const candidateHash = hashBackupCode(token);
  const consumed = await prisma.$executeRaw(Prisma.sql`
    UPDATE "User"
    SET "twoFactorBackupCodes" = array_remove("twoFactorBackupCodes", ${candidateHash})
    WHERE "id" = ${userId} AND ${candidateHash} = ANY("twoFactorBackupCodes")
  `);

  if (consumed > 0) {
    const after = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorBackupCodes: true },
    });

    recordAudit({
      actorUserId: userId,
      actorRole: "USER",
      action: "TWO_FACTOR_VERIFIED" as never,
      entityType: "User",
      entityId: userId,
      metadata: {
        method: "backup_code",
        remainingBackupCodes: after?.twoFactorBackupCodes.length ?? 0,
      },
    }).catch(() => {});

    return true;
  }

  // --- Both paths failed ---
  recordAudit({
    actorUserId: userId,
    actorRole: "USER",
    action: "TWO_FACTOR_FAILED" as never,
    entityType: "User",
    entityId: userId,
  }).catch(() => {});

  return false;
}

// ---------------------------------------------------------------------------
// Disable 2FA
// ---------------------------------------------------------------------------

/**
 * Disable 2FA on the account. Requires the current account password as a
 * confirmation step to prevent a session-hijack from silently removing 2FA.
 *
 * Clears all 2FA fields and emits an audit event.
 * Throws `AuthInvalidCredentialsError`-compatible errors via bcrypt path;
 * callers should catch and return 400.
 */
export async function disableTwoFactor(
  userId: string,
  currentPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
      twoFactorEnabled: true,
    },
  });

  if (!user || !user.isActive) {
    throw new TwoFactorNotConfiguredError();
  }

  if (!user.twoFactorEnabled) {
    throw new TwoFactorNotConfiguredError();
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    // Real class (not a name-tagged plain Error) so `instanceof` checks at
    // the route layer work the same way they do for changeUserPassword.
    throw new AuthInvalidCredentialsError();
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorVerifiedAt: null,
      twoFactorEnabledAt: null,
      // S-007b: bump tokenVersion — a stolen cookie that just disabled 2FA
      // must not retain any of its old session authority either.
      tokenVersion: { increment: 1 },
    },
  });

  recordAudit({
    actorUserId: userId,
    actorRole: "USER",
    action: "TWO_FACTOR_DISABLED" as never,
    entityType: "User",
    entityId: userId,
  }).catch(() => {});
}
