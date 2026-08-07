import { createHash, randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import {
  sendMembershipClaimConfirmationEmail,
  sendMembershipEnrollmentConfirmedEmail,
} from "./membership-emails.js";

/**
 * The two-step membership claim (§5.3).
 *
 * The single-step version this replaces checked only that a submitted id and
 * email matched a row — which proves nothing about who is asking. Anyone who
 * had seen a member's card could attach that membership to their own account
 * silently, and the `emailVerifiedAt` gate does not help: it proves the
 * claimant owns *their* address, not the enrolled one.
 *
 * So step 1 matches the row and mails a single-use link to the **enrolled**
 * address; step 2 attaches the enrollment, and only for the session that asked
 * for the link. Token mechanics copy `PasswordResetToken`: 32 random bytes,
 * sha256 hash stored, raw token never persisted, single use, 24h expiry.
 *
 * The step-1 response is identical for a hit and a miss. Partner membership
 * ids are frequently sequential, so anything that varies with existence —
 * wording, status, timing-visible work — is an enumeration oracle.
 */

const CLAIM_TOKEN_TTL_HOURS = 24;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  // 32 bytes → 43-char base64url, same as the password-reset/verification tokens.
  return randomBytes(32).toString("base64url");
}

export type ClaimRequestOutcome =
  /** Generic success. Says nothing about whether a row matched. */
  | { status: "accepted" }
  /** The requester's OWN account is unverified — their problem, not a leak. */
  | { status: "email_not_verified" };

export type ClaimConfirmOutcome =
  | { status: "confirmed"; enrollmentId: string; enrollmentStatus: "ACTIVE" | "EXPIRED" }
  /** Bad, expired, reused or wrong-session token, or the row stopped being claimable. */
  | { status: "rejected" };

/**
 * Step 1 — request. Always resolves to the same shape for a hit and a miss;
 * only an unverified requester gets a distinct outcome, and that is a fact
 * about their own account.
 */
export async function requestMembershipClaim(opts: {
  userId: string;
  membershipId: string;
  email: string;
  request?: FastifyRequest;
}): Promise<ClaimRequestOutcome> {
  const membershipId = opts.membershipId.trim();
  const email = opts.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  // Same gate as the linker (§5.2). An unverified requester cannot be trusted
  // to be reachable at all, so nothing is mailed on their behalf.
  if (!user?.emailVerifiedAt) return { status: "email_not_verified" };

  const enrollment = await prisma.membershipEnrollment.findFirst({
    where: {
      membershipId: { equals: membershipId, mode: "insensitive" },
      email: { equals: email, mode: "insensitive" },
      userId: null,
      // Only PENDING is claimable. A member-facing form must never be able to
      // revive a SUSPENDED row an admin just paused, or walk back EXPIRED /
      // REMOVED.
      status: "PENDING",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      membershipId: true,
      plan: { select: { name: true, primaryCountryId: true } },
      level: { select: { name: true } },
    },
  });

  // Audited on EVERY attempt, hit or miss (§14). The entity is the attempt,
  // not an enrollment — a miss has no enrollment to point at, and the probed
  // ids are exactly what enumeration detection needs.
  await recordAudit({
    action: "MEMBERSHIP_CLAIM_REQUESTED",
    entityType: "MembershipClaimAttempt",
    entityId: membershipId.toLowerCase(),
    actorUserId: user.id,
    metadata: { matched: enrollment !== null, submittedEmail: email },
    ...(opts.request ? { request: opts.request } : {}),
  });

  if (!enrollment) return { status: "accepted" };

  const token = generateToken();
  await prisma.membershipClaimToken.create({
    data: {
      enrollmentId: enrollment.id,
      userId: user.id,
      tokenHash: hashToken(token),
      email: enrollment.email,
      expiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_HOURS * 60 * 60 * 1000),
    },
  });

  // To the ENROLLED address. Best-effort: a mail failure must not turn into a
  // different response than a miss produces, or the difference is the oracle.
  await sendMembershipClaimConfirmationEmail({
    to: enrollment.email,
    firstName: enrollment.firstName,
    planName: enrollment.plan.name,
    levelName: enrollment.level.name,
    membershipId: enrollment.membershipId,
    countryId: enrollment.plan.primaryCountryId,
    requesterEmail: user.email,
    token,
  }).catch(() => undefined);

  return { status: "accepted" };
}

/**
 * Step 2 — confirm. Everything is re-checked here: the enrollment may have
 * linked, been suspended or been removed in the 24h the link was valid.
 */
export async function confirmMembershipClaim(opts: {
  userId: string;
  token: string;
  request?: FastifyRequest;
}): Promise<ClaimConfirmOutcome> {
  const now = new Date();
  const row = await prisma.membershipClaimToken.findUnique({
    where: { tokenHash: hashToken(opts.token) },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
      enrollment: {
        select: {
          id: true,
          userId: true,
          status: true,
          endDate: true,
          planId: true,
          membershipId: true,
          firstName: true,
          plan: { select: { name: true, primaryCountryId: true } },
          level: { select: { name: true } },
        },
      },
    },
  });

  async function reject(reason: string, entityId: string) {
    await recordAudit({
      action: "MEMBERSHIP_CLAIM_REJECTED",
      entityType: "MembershipClaimAttempt",
      entityId,
      actorUserId: opts.userId,
      metadata: { reason },
      ...(opts.request ? { request: opts.request } : {}),
    });
    return { status: "rejected" as const };
  }

  if (!row) return reject("unknown_token", "unknown");
  if (row.usedAt) return reject("token_already_used", row.enrollment.membershipId.toLowerCase());
  if (row.expiresAt < now) return reject("token_expired", row.enrollment.membershipId.toLowerCase());
  // A leaked or forwarded link is useless to anyone but the requester.
  if (row.userId !== opts.userId) {
    return reject("wrong_session", row.enrollment.membershipId.toLowerCase());
  }
  if (row.enrollment.userId !== null || row.enrollment.status !== "PENDING") {
    return reject("enrollment_not_claimable", row.enrollment.membershipId.toLowerCase());
  }

  // Only a passed endDate expires the row; a future startDate still links as
  // ACTIVE and is withheld by the live date check at pricing time (§5.2).
  const nextStatus =
    row.enrollment.endDate && row.enrollment.endDate < now ? ("EXPIRED" as const) : ("ACTIVE" as const);

  const claimed = await prisma.$transaction(async (tx) => {
    // Both updates are conditional, so two concurrent opens of the same link
    // cannot both win, and neither can a link that raced the linker.
    const tokenClaim = await tx.membershipClaimToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (tokenClaim.count === 0) return false;

    const enrollmentClaim = await tx.membershipEnrollment.updateMany({
      where: { id: row.enrollment.id, userId: null, status: "PENDING" },
      data: { userId: opts.userId, linkedAt: now, claimedAt: now, status: nextStatus },
    });
    if (enrollmentClaim.count === 0) {
      // Roll the token back with the transaction rather than burning it on a
      // claim that did not happen.
      throw new ClaimRaceError();
    }
    return true;
  }).catch((error: unknown) => {
    if (error instanceof ClaimRaceError) return false;
    throw error;
  });

  if (!claimed) return reject("claim_race_lost", row.enrollment.membershipId.toLowerCase());

  await recordAudit({
    action: "MEMBERSHIP_CLAIM_CONFIRMED",
    entityType: "MembershipEnrollment",
    entityId: row.enrollment.id,
    actorUserId: opts.userId,
    metadata: {
      planId: row.enrollment.planId,
      membershipId: row.enrollment.membershipId,
      status: nextStatus,
    },
    ...(opts.request ? { request: opts.request } : {}),
  });

  // Same notice the linker sends when an enrollment attaches by verified email
  // — a claim is just the other way in, so the member gets the same mail.
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { email: true, preferredLocale: true },
  });
  if (user) {
    await sendMembershipEnrollmentConfirmedEmail({
      to: user.email,
      firstName: row.enrollment.firstName,
      planName: row.enrollment.plan.name,
      levelName: row.enrollment.level.name,
      membershipId: row.enrollment.membershipId,
      countryId: row.enrollment.plan.primaryCountryId,
      preferredLocale: user.preferredLocale,
    }).catch(() => undefined);
  }

  return { status: "confirmed", enrollmentId: row.enrollment.id, enrollmentStatus: nextStatus };
}

/** Internal signal to roll back the token claim when the enrollment update loses. */
class ClaimRaceError extends Error {
  constructor() {
    super("membership claim race lost");
    this.name = "ClaimRaceError";
  }
}
