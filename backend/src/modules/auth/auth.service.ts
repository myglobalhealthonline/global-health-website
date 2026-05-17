import bcrypt from "bcryptjs";
import { UserRole, type User } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import type { LoginBody, RegisterBody } from "../../validations/auth.schema.js";

export type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  emailVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export class AuthInvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "AuthInvalidCredentialsError";
  }
}

export class AuthConflictError extends Error {
  constructor() {
    super("We could not complete registration with those details");
    this.name = "AuthConflictError";
  }
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function registerPatient(input: RegisterBody) {
  const email = input.email.toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone && input.phone.trim().length > 0 ? input.phone.trim() : null,
        role: UserRole.PATIENT,
      },
    });
    return toSafeUser(user);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      throw new AuthConflictError();
    }
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

/**
 * Claim any guest appointments whose email matches this user's. Guests can
 * book without an account; on first register or login we want their
 * historic bookings to surface in /account/bookings instead of vanishing.
 *
 * Match is case-insensitive on email AND scoped to rows that have no
 * existing owner (userId IS NULL). Returns the count of rows linked.
 * Failure is logged at the caller; we don't throw because account creation
 * / login shouldn't be blocked by a backfill miss.
 */
export async function claimGuestAppointmentsForUser(
  userId: string,
  email: string,
): Promise<number> {
  try {
    const result = await prisma.appointment.updateMany({
      where: {
        userId: null,
        email: { equals: email, mode: "insensitive" },
      },
      data: { userId },
    });
    return result.count;
  } catch {
    return 0;
  }
}

export async function loginUser(input: LoginBody) {
  const email = input.email.toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new AuthInvalidCredentialsError();
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AuthInvalidCredentialsError();
    }
    return toSafeUser(user);
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) throw error;
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

export async function getSafeUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;
    return toSafeUser(user);
  } catch (error) {
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

export type ProfilePatchInput = {
  fullName?: string;
  phone?: string | null;
};

/**
 * Change password while logged-in. Requires the user's current password as
 * a confirmation step — same pattern Stripe, Google etc. use. Throws
 * `AuthInvalidCredentialsError` when the current password doesn't match so
 * the route can return 400 without leaking which side failed.
 */
export async function changeUserPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<SafeUser> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) throw new AuthInvalidCredentialsError();
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) throw new AuthInvalidCredentialsError();
    const newHash = await bcrypt.hash(newPassword, 12);
    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash: newHash },
    });
    return toSafeUser(updated);
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) throw error;
    throw normalizeDbError(error, "Could not change password");
  }
}

/**
 * Soft-delete the user's account: scrubs PII and flips `isActive` to false.
 * We don't hard-delete because Appointments must keep their audit trail
 * (Stripe ledger, admin records, regulatory). After delete the user can
 * no longer log in; their booking rows persist with the historic name/
 * email already on the row.
 */
export async function deleteOwnAccount(id: string): Promise<void> {
  try {
    const scrubbedEmail = `deleted-${id}@deleted.local`;
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        // Replace identifying fields with deterministic placeholders so a
        // future re-registration with the original email can succeed.
        email: scrubbedEmail,
        fullName: "[deleted account]",
        phone: null,
        emailVerifiedAt: null,
        // Re-randomise the password hash so any leaked plaintext is moot.
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
      },
    });
    // Detach the user from past Appointment rows — admin still sees the
    // booking history but the link to the now-deleted user is broken.
    await prisma.appointment.updateMany({
      where: { userId: id },
      data: { userId: null },
    });
    // Burn outstanding password-reset and email-verification tokens.
    await prisma.passwordResetToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await prisma.emailVerificationToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not delete account");
  }
}

/** GDPR data-export: dump everything we hold about a user as JSON. */
export async function exportUserData(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;
    const appointments = await prisma.appointment.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    });
    const payments = await prisma.payment.findMany({
      where: { appointment: { userId: id } },
      orderBy: { createdAt: "desc" },
    });
    return {
      exportedAt: new Date().toISOString(),
      user: toSafeUser(user),
      appointments,
      payments,
    };
  } catch (error) {
    throw normalizeDbError(error, "Could not export user data");
  }
}

export async function patchUserProfile(id: string, input: ProfilePatchInput) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone !== undefined && { phone: input.phone }),
      },
    });
    return toSafeUser(user);
  } catch (error) {
    throw normalizeDbError(error, "Could not update profile");
  }
}

/* ─────────────────────────────────────────────────────────────
   Token helpers — password reset + email verification.
   Both tokens are random URL-safe strings sent in the email link;
   only their SHA-256 hash is stored, so a DB leak doesn't expose
   usable links. Each token is single-use (usedAt set on consume).
   ───────────────────────────────────────────────────────────── */

import { createHash, randomBytes } from "node:crypto";

const PASSWORD_RESET_TTL_MINUTES = 60;
const EMAIL_VERIFICATION_TTL_HOURS = 24;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  // 32 bytes → 43-char base64url, plenty of entropy.
  return randomBytes(32).toString("base64url");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  } catch (error) {
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

/** Issue a password-reset token; expires in 1 hour. Returns the plain token
 *  the caller can email. The DB only stores its SHA-256 hash. */
export async function issuePasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  try {
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not issue password reset token");
  }
  return token;
}

/** Validate + consume a password-reset token, hash a new password, save. */
export async function consumePasswordResetToken(token: string, newPassword: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  try {
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row) return false;
    if (row.usedAt) return false;
    if (row.expiresAt.getTime() < Date.now()) return false;

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not reset password");
  }
}

/** Issue an email-verification token; expires in 24 hours. */
export async function issueEmailVerificationToken(userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
  try {
    await prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not issue verification token");
  }
  return token;
}

/** Validate + consume an email-verification token; sets emailVerifiedAt. */
export async function consumeEmailVerificationToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  try {
    const row = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!row) return false;
    if (row.usedAt) return false;
    if (row.expiresAt.getTime() < Date.now()) return false;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not verify email");
  }
}
