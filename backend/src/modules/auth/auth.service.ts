import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { Prisma, UserRole, VerificationStatus, type User } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import type { LoginBody, RegisterBody } from "../../validations/auth.schema.js";
import { generateGlobalHealthNumber } from "../../lib/global-health-number.js";
import {
  computeEmailBlindIndex,
  computePhoneBlindIndex,
} from "../../lib/blind-index.js";

export type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  /** Canonical patient DOB. ISO date string (YYYY-MM-DD…) or null.
   *  Stored once on the User; every checkout / fallback intake form
   *  prefills from this instead of asking again. */
  dateOfBirth: string | null;
  role: UserRole;
  emailVerifiedAt: string | null;
  isActive: boolean;
  /** Set TRUE when account was created with a temporary password
   *  (admin walk-in flow). Frontend force-redirects the user to
   *  /account/change-password on first authenticated request. Cleared
   *  the moment the user changes the password themselves. */
  mustChangePassword: boolean;
  /** Set when a GDPR deletion request is pending (30-day grace period).
   *  ISO datetime or null. The account stays functional until this date;
   *  the security page shows a cancellable banner while it's set. */
  deletionScheduledAt: string | null;
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
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    deletionScheduledAt: user.deletionScheduledAt ? user.deletionScheduledAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function registerPatient(input: RegisterBody) {
  const email = input.email.toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);

  // Generate GHN before transaction — atomic counter guarantees uniqueness.
  let ghn: string;
  try {
    ghn = await generateGlobalHealthNumber();
  } catch {
    // If GHN generation fails (DB unavailable at counter step), generate a
    // temporary fallback using timestamp+random. A backfill job normalises
    // these. This path should never happen in production with a healthy DB.
    ghn = `GH-${new Date().getFullYear()}-T${Date.now().toString(36).toUpperCase()}`;
  }

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

    // Create PatientProfile immediately with GHN so it is always present
    // from registration. upsert protects against the rare case where a
    // PatientProfile was pre-created (e.g. manual booking before signup).
    const profile = await prisma.patientProfile.upsert({
      where: { email },
      create: {
        email,
        userId: user.id,
        fullName: input.fullName,
        phone: input.phone?.trim() || null,
        globalHealthNumber: ghn,
        emailVerificationStatus: VerificationStatus.NOT_VERIFIED,
        // Blind indexes for duplicate detection. No-op (null) until
        // BLIND_INDEX_KEY is configured. nameDobHash is left null here —
        // DOB isn't collected at registration; it backfills on profile update.
        emailHash: computeEmailBlindIndex(email),
        phoneHash: input.phone?.trim()
          ? computePhoneBlindIndex(input.phone.trim())
          : null,
        nameDobHash: null,
      },
      update: {
        userId: user.id,
        // Only set GHN if the profile doesn't already have one.
        ...(await prisma.patientProfile
          .findUnique({ where: { email }, select: { globalHealthNumber: true } })
          .then((p) => (!p?.globalHealthNumber ? { globalHealthNumber: ghn } : {}))
          .catch(() => ({}))),
      },
    });

    // Append-only audit record of terms/privacy acceptance at signup.
    // Schema validation guarantees acceptTerms === true by this point.
    await prisma.patientConsent
      .create({
        data: {
          patientProfileId: profile.id,
          globalHealthNumber: profile.globalHealthNumber,
          consentType: "TERMS_PRIVACY",
          consentValue: true,
          source: "PATIENT_PORTAL",
          changedByUserId: user.id,
          changedByRole: UserRole.PATIENT,
        },
      })
      .catch((err) => {
        // Never fail registration over the audit row — log and continue.
        console.error("Failed to record TERMS_PRIVACY consent", err);
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

/**
 * Same idea as `claimGuestAppointmentsForUser` but for cart Orders the
 * patient placed as a guest. Matches case-insensitively on email and
 * scopes to rows with no existing owner. Failure is swallowed so
 * register/login aren't blocked by a backfill miss.
 */
export async function claimGuestOrdersForUser(
  userId: string,
  email: string,
): Promise<number> {
  try {
    const result = await prisma.order.updateMany({
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

export async function loginUser(
  input: LoginBody,
): Promise<{ user: SafeUser; twoFactorEnabled: boolean; tokenVersion: number }> {
  const email = input.email.toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || isPastDeletionDate(user)) {
      throw new AuthInvalidCredentialsError();
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AuthInvalidCredentialsError();
    }
    const twoFactorEnabled = Boolean((user as Record<string, unknown>).twoFactorEnabled);
    return { user: toSafeUser(user), twoFactorEnabled, tokenVersion: user.tokenVersion };
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) throw error;
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

/** True once the account's grace-period deletion date has passed. Used to
 *  treat a scheduled-but-not-yet-purged deletion as inactive, same as
 *  `isActive: false`, without needing a cron job in this pass. */
function isPastDeletionDate(user: Pick<User, "deletionScheduledAt">): boolean {
  return Boolean(user.deletionScheduledAt && user.deletionScheduledAt.getTime() < Date.now());
}

/** Raw tokenVersion lookup for callers that mint a JWT outside the normal
 *  login flow (e.g. the invite-accept path) and need it to embed in the
 *  token. Defaults to 0 if the user is somehow gone by this point — the
 *  session simply won't survive the very next tokenVersion bump. */
export async function getUserTokenVersion(id: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id }, select: { tokenVersion: true } });
  return user?.tokenVersion ?? 0;
}

export async function getSafeUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive || isPastDeletionDate(user)) return null;
    return toSafeUser(user);
  } catch (error) {
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

export type ProfilePatchInput = {
  fullName?: string;
  phone?: string | null;
  /** ISO date string (YYYY-MM-DD) or full ISO datetime. Stored at
   *  start-of-day UTC so we don't accidentally shift across timezones
   *  when the user is east/west of UTC. Pass null to clear. */
  dateOfBirth?: string | null;
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
      // Clear the must-change flag on a successful self-rotation —
      // the temp password is now invalid, so the gate is satisfied.
      data: { passwordHash: newHash, mustChangePassword: false },
    });
    return toSafeUser(updated);
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) throw error;
    throw normalizeDbError(error, "Could not change password");
  }
}

/** "Sign out of all devices": bump tokenVersion so every previously-issued
 *  JWT (this device included) fails the tokenVersion check in requireAuth
 *  on its next request. Returns the new version so the caller can decide
 *  whether to also clear the current request's cookie. */
export async function signOutAllDevices(id: string): Promise<number> {
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    return updated.tokenVersion;
  } catch (error) {
    throw normalizeDbError(error, "Could not sign out other devices");
  }
}

const DELETION_GRACE_DAYS = 30;

/**
 * GDPR account deletion, grace-period version. Sets `deletionScheduledAt`
 * to now+30d instead of scrubbing immediately — the account stays fully
 * functional (login, bookings) until then, and the patient can cancel via
 * `cancelAccountDeletion`.
 *
 * The actual PII scrub + hard-delete on expiry is NOT implemented here.
 * ponytail: needs a purge cron reading deletionScheduledAt < now — no
 * existing cron system is a natural fit for a one-off account purge (see
 * the field comment on `User.deletionScheduledAt` in schema.prisma); wire
 * it in when that job is actually built. Until then, expired accounts are
 * simply treated as inactive (login blocked) by `isPastDeletionDate`
 * without their data being removed.
 */
export async function requestAccountDeletion(id: string): Promise<{ deletionScheduledAt: string }> {
  try {
    const scheduledAt = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id },
      data: { deletionScheduledAt: scheduledAt },
    });
    return { deletionScheduledAt: scheduledAt.toISOString() };
  } catch (error) {
    throw normalizeDbError(error, "Could not schedule account deletion");
  }
}

/** Cancel a pending grace-period deletion — clears the field, account is
 *  unaffected (it was never deactivated). No-op if nothing was scheduled. */
export async function cancelAccountDeletion(id: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id },
      data: { deletionScheduledAt: null },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not cancel account deletion");
  }
}

// GDPR export paging. We page in bounded batches (so a long-lived account
// can't OOM the process) but page all the way to completion instead of
// silently dropping older rows. A very high ceiling guards against a
// pathological/abusive volume; if it is ever hit the export is flagged
// `partial: true` so the result is never an incomplete payload masquerading
// as complete.
const EXPORT_BATCH = 1000;
const EXPORT_HARD_CEILING = 100_000;

async function pageAll<T extends { id: string }>(
  fetchBatch: (cursor: string | undefined) => Promise<T[]>,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    if (rows.length >= EXPORT_HARD_CEILING) return { rows, truncated: true };
    const batch = await fetchBatch(cursor);
    rows.push(...batch);
    if (batch.length < EXPORT_BATCH) return { rows, truncated: false };
    cursor = batch[batch.length - 1].id;
  }
}

/** GDPR data-export: dump everything we hold about a user as JSON. */
export async function exportUserData(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;

    const appointments = await pageAll((cursor) =>
      prisma.appointment.findMany({
        where: { userId: id },
        orderBy: { id: "desc" },
        take: EXPORT_BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
    );
    const payments = await pageAll((cursor) =>
      prisma.payment.findMany({
        where: { appointment: { userId: id } },
        orderBy: { id: "desc" },
        take: EXPORT_BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
    );

    return {
      exportedAt: new Date().toISOString(),
      // True only if a row count exceeded EXPORT_HARD_CEILING — the export
      // is explicitly marked incomplete rather than silently truncated.
      partial: appointments.truncated || payments.truncated,
      user: toSafeUser(user),
      appointments: appointments.rows,
      payments: payments.rows,
    };
  } catch (error) {
    throw normalizeDbError(error, "Could not export user data");
  }
}

export async function patchUserProfile(id: string, input: ProfilePatchInput) {
  try {
    // Parse YYYY-MM-DD or full ISO into a start-of-day UTC Date so the
    // stored timestamp doesn't drift when the user is on a non-UTC
    // browser. `null` clears the column.
    let dobValue: Date | null | undefined = undefined;
    if (input.dateOfBirth !== undefined) {
      if (input.dateOfBirth === null) {
        dobValue = null;
      } else {
        const datePart = input.dateOfBirth.slice(0, 10);
        const parsed = new Date(`${datePart}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Invalid date of birth");
        }
        dobValue = parsed;
      }
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(dobValue !== undefined && { dateOfBirth: dobValue }),
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

/** Issue a password-reset token; default expiry 1 hour. Pass
 *  `{ ttlMinutes }` to override (used for the doctor-invite flow that
 *  needs a 7-day window). Pass `{ isInvite: true }` to flag the token
 *  as an invite so the consume path knows whether implicit
 *  session-creation is allowed. Returns the plain token the caller
 *  can email — the DB only stores its SHA-256 hash. */
export async function issuePasswordResetToken(
  userId: string,
  options?: { ttlMinutes?: number; isInvite?: boolean },
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const ttl =
    options?.ttlMinutes && options.ttlMinutes > 0
      ? options.ttlMinutes
      : PASSWORD_RESET_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
  try {
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        isInvite: options?.isInvite === true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not issue password reset token");
  }
  return token;
}

export type ConsumeResetResult =
  | { ok: true; userId: string; isInvite: boolean }
  | { ok: false };

/** Validate + consume a password-reset token, hash a new password, save.
 *  Returns the user id + whether the token was issued AS AN INVITE so
 *  the caller can decide whether to mint a session cookie / set
 *  emailVerifiedAt. A regular forgot-password token returns
 *  isInvite=false even if the caller asked for `invite=true`. */
export async function consumePasswordResetToken(
  token: string,
  newPassword: string,
): Promise<ConsumeResetResult> {
  const tokenHash = hashToken(token);
  try {
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row) return { ok: false };
    if (row.usedAt) return { ok: false };
    if (row.expiresAt.getTime() < Date.now()) return { ok: false };

    const passwordHash = await bcrypt.hash(newPassword, 12);
    // Invite tokens additionally flip emailVerifiedAt — the doctor just
    // proved control of the inbox by clicking the link, so we don't
    // need a separate verification step. Regular forgot-password
    // tokens leave verification state alone.
    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.user.update({
        where: { id: row.userId },
        // Resetting the password via the email token always satisfies
        // the must-change gate (the patient just proved control of
        // the inbox AND chose their own password).
        data: row.isInvite
          ? { passwordHash, emailVerifiedAt: new Date(), mustChangePassword: false }
          : { passwordHash, mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ];
    await prisma.$transaction(updates);
    return { ok: true, userId: row.userId, isInvite: row.isInvite };
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
