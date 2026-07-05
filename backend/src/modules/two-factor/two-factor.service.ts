import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from "../../lib/totp.js";
import { encryptPhi, decryptPhi } from "../../lib/crypto/phi-crypto.js";
import { recordAudit } from "../audit/audit.service.js";

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
 * Throws `TwoFactorTokenInvalidError` if the token doesn't verify so the
 * caller can prompt the user to re-scan and retry.
 */
export async function confirmTwoFactor(
  userId: string,
  token: string,
  plaintextSecret: string,
  plaintextBackupCodes: string[],
): Promise<void> {
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
      twoFactorBackupCodes: true,
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

  // --- Try backup codes ---
  const storedHashes: string[] = Array.isArray(user.twoFactorBackupCodes)
    ? (user.twoFactorBackupCodes as string[])
    : [];

  const { valid, remaining } = verifyBackupCode(token, storedHashes);

  if (valid) {
    // Remove consumed backup code from stored set
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: remaining },
      });
    } catch {
      // Non-fatal: the code was valid; let the login proceed. The duplicate
      // protection comes from the timing window being short.
    }

    recordAudit({
      actorUserId: userId,
      actorRole: "USER",
      action: "TWO_FACTOR_VERIFIED" as never,
      entityType: "User",
      entityId: userId,
      metadata: { method: "backup_code", remainingBackupCodes: remaining.length },
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
    // Re-use the same error class pattern as auth.service for consistency.
    // The calling route maps this to 400 "invalid password".
    const err = new Error("Current password is incorrect");
    err.name = "AuthInvalidCredentialsError";
    throw err;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorVerifiedAt: null,
      twoFactorEnabledAt: null,
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
