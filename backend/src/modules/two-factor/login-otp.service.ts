import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../../db/prisma.js";

/**
 * Task 4 (docs/security/phi-access-recovery-plan-2026-07-17.md): email-OTP —
 * the "easy" second factor for REQUIRE_2FA_FOR_ROLES accounts that never
 * enrolled TOTP — plus the 30-day "trusted device" cookie that lets either
 * method skip re-challenging on a known browser.
 *
 * Verification success stamps `User.twoFactorVerifiedAt` — the SAME field
 * `confirmTwoFactor` (TOTP enrollment) stamps — so medical-access-guard,
 * admin-auth, and doctor-auth need no new "which method" branching: they
 * already just check that timestamp is set.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Hashing — same pattern as lib/totp.ts's hashBackupCode: HMAC with a fixed
// domain-separation label (not a secret) rather than bare SHA-256.
// ---------------------------------------------------------------------------

function hashOtpCode(code: string): string {
  return createHmac("sha256", "login-otp-hash").update(code.trim(), "utf8").digest("hex");
}

function hashDeviceToken(token: string): string {
  // The device token itself is 32 random bytes (256 bits) — no domain
  // separation needed, a plain SHA-256 is the standard "hash the bearer
  // token for at-rest storage" pattern (matches PasswordResetToken).
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generateOtpCode(): string {
  // node:crypto randomInt is uniform (no modulo bias), unlike Math.random.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// ---------------------------------------------------------------------------
// Email OTP
// ---------------------------------------------------------------------------

export class LoginOtpExpiredError extends Error {
  constructor() {
    super("This code has expired or was replaced by a newer one. Request a new code.");
    this.name = "LoginOtpExpiredError";
  }
}

/**
 * Issue a fresh 6-digit code for `userId`. Invalidates any still-pending
 * code for the same user first — only one code is ever valid at a time, so
 * "resend" and "issue" are the same operation. Returns the PLAINTEXT code;
 * the caller is responsible for emailing it and never logging it.
 */
export async function issueLoginOtp(userId: string): Promise<string> {
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.$transaction([
    // Consume any still-pending code so a leaked/old email can't be replayed
    // alongside a freshly requested one.
    prisma.loginOtp.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.loginOtp.create({
      data: { userId, codeHash, expiresAt },
    }),
  ]);

  return code;
}

export type VerifyLoginOtpResult =
  | { ok: true }
  | { ok: false; reason: "no_pending_code" | "expired" | "wrong_code" };

/**
 * Verify a user-supplied code against the most recent pending row.
 * - No unconsumed row, or it's past `expiresAt` → "expired" (re-issue flow).
 * - Wrong code → attempts incremented; the 5th miss consumes the row too
 *   ("expired" on the NEXT call, same as a TTL expiry — no separate
 *   "locked out" state to design a UI for).
 * - Correct code → row marked consumed and `User.twoFactorVerifiedAt`
 *   stamped in the same transaction.
 */
export async function verifyLoginOtp(userId: string, code: string): Promise<VerifyLoginOtpResult> {
  const pending = await prisma.loginOtp.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!pending) return { ok: false, reason: "no_pending_code" };
  if (pending.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const candidate = hashOtpCode(code);
  const candidateBuf = Buffer.from(candidate, "hex");
  const storedBuf = Buffer.from(pending.codeHash, "hex");
  const matches =
    storedBuf.length === candidateBuf.length && timingSafeEqual(storedBuf, candidateBuf);

  if (!matches) {
    const attempts = pending.attempts + 1;
    const exhausted = attempts >= OTP_MAX_ATTEMPTS;
    await prisma.loginOtp.update({
      where: { id: pending.id },
      data: { attempts, ...(exhausted ? { consumedAt: new Date() } : {}) },
    });
    return { ok: false, reason: "wrong_code" };
  }

  await prisma.$transaction([
    prisma.loginOtp.update({
      where: { id: pending.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorVerifiedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Trusted device
// ---------------------------------------------------------------------------

/**
 * Issue a new 30-day trusted-device token for `userId`. Returns the
 * PLAINTEXT token to set as an httpOnly cookie — only its hash is stored.
 */
export async function issueTrustedDevice(userId: string, userAgent?: string | null): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.trustedDevice.create({
    data: {
      userId,
      tokenHash: hashDeviceToken(token),
      userAgent: userAgent?.slice(0, 200) ?? null,
      expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS),
    },
  });
  return token;
}

/** True when `token` matches an unexpired trusted-device row for `userId`. */
export async function isTrustedDevice(userId: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.trustedDevice.findUnique({
    where: { tokenHash: hashDeviceToken(token) },
    select: { userId: true, expiresAt: true },
  });
  if (!row || row.userId !== userId) return false;
  return row.expiresAt.getTime() > Date.now();
}

/** Revoke every trusted device for a user — wired into password change and
 *  "sign out of all devices" (auth.service.ts) so either one forces every
 *  other browser back through the second factor. */
export async function revokeTrustedDevices(userId: string): Promise<void> {
  await prisma.trustedDevice.deleteMany({ where: { userId } });
}

export const TRUSTED_DEVICE_COOKIE_MAX_AGE_MS = TRUSTED_DEVICE_TTL_MS;
