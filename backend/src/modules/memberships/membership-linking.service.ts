import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { sendMembershipEnrollmentConfirmedEmail } from "./membership-emails.js";

/**
 * Account linking for private membership enrollments
 * (docs/plans/private-membership-plans-implementation.md §5.2).
 *
 * An imported enrollment starts `PENDING` and grants nothing. It becomes the
 * member's only when the account proves it owns the address the partner
 * supplied.
 *
 * **The gate is `User.emailVerifiedAt`, not a matching email string.** Anyone
 * can register with someone else's address; without the gate they would inherit
 * that person's membership, card and allowance. Verification is the primary
 * trigger, login the backstop for enrollments imported after the user verified.
 *
 * Call `linkMembershipsForUser` from EVERY place that sets `emailVerifiedAt` —
 * not just signup and verification. Today that is `auth.service.ts`
 * (`consumeEmailVerificationToken` and the invite-token password reset),
 * `corporate-invite.service.ts`, and the admin patient-profile route. A member
 * verified through any other path would otherwise never link.
 */

export type LinkResult = {
  linked: number;
  enrollmentIds: string[];
};

const EMPTY: LinkResult = { linked: 0, enrollmentIds: [] };

/**
 * Link every unlinked `PENDING` enrollment matching this user's verified
 * address.
 *
 * Idempotent by construction: the claim is a conditional `updateMany` on
 * `userId: null`, so two concurrent logins cannot both link the same row, and a
 * row already linked is not returned by the query at all — which is also what
 * makes "send the confirmation email once per enrollment" true without a
 * separate sent-flag.
 */
export async function linkMembershipsForUser(userId: string): Promise<LinkResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true, fullName: true, preferredLocale: true },
  });
  // No verified mailbox → no proof of ownership → nothing links. This is the
  // whole point of §5.2; do not relax it.
  if (!user?.emailVerifiedAt) return EMPTY;

  const email = user.email.trim().toLowerCase();
  const candidates = await prisma.membershipEnrollment.findMany({
    where: {
      email: { equals: email, mode: "insensitive" },
      userId: null,
      status: "PENDING",
    },
    select: {
      id: true,
      planId: true,
      endDate: true,
      membershipId: true,
      firstName: true,
      plan: { select: { name: true, primaryCountryId: true } },
      level: { select: { name: true } },
    },
  });
  if (candidates.length === 0) return EMPTY;

  const now = new Date();
  const linkedIds: string[] = [];

  for (const candidate of candidates) {
    // A future startDate links as ACTIVE — only a passed endDate expires the
    // row. EXPIRED is terminal, so treating "term has not started yet" as
    // expired would permanently kill a correctly-imported future membership;
    // pricing re-checks `startDate <= now` live anyway (§5.1/§6.2).
    const status = candidate.endDate && candidate.endDate < now ? "EXPIRED" : "ACTIVE";
    const claim = await prisma.membershipEnrollment.updateMany({
      where: { id: candidate.id, userId: null },
      data: { userId: user.id, linkedAt: now, status },
    });
    if (claim.count === 0) continue; // another request won the race

    linkedIds.push(candidate.id);
    await recordAudit({
      action: "MEMBERSHIP_ENROLLMENT_LINKED",
      entityType: "MembershipEnrollment",
      entityId: candidate.id,
      actorUserId: user.id,
      metadata: { planId: candidate.planId, membershipId: candidate.membershipId, status },
    });

    // Best-effort: a mail failure must never undo a successful link.
    await sendMembershipEnrollmentConfirmedEmail({
      to: user.email,
      firstName: candidate.firstName,
      planName: candidate.plan.name,
      levelName: candidate.level.name,
      membershipId: candidate.membershipId,
      countryId: candidate.plan.primaryCountryId,
      preferredLocale: user.preferredLocale,
    }).catch(() => undefined);
  }

  return { linked: linkedIds.length, enrollmentIds: linkedIds };
}

/**
 * Same rule, entered from the enrollment side: an admin has just created or
 * imported a row, so link it immediately if that address already belongs to a
 * verified account. An unverified account is left alone — it links when it
 * verifies, which is exactly the hole §8.2 closes.
 */
export async function linkMembershipsForEmail(email: string): Promise<LinkResult> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" }, emailVerifiedAt: { not: null } },
    select: { id: true },
  });
  if (!user) return EMPTY;
  return linkMembershipsForUser(user.id);
}

/**
 * Fire-and-forget wrapper for the auth paths. Linking must never be able to
 * fail a login or a verification, so everything is swallowed and logged.
 */
export function linkMembershipsInBackground(userId: string): void {
  linkMembershipsForUser(userId).catch((error: unknown) => {
    console.warn("[memberships] linking failed", {
      userId,
      error: error instanceof Error ? error.message : error,
    });
  });
}
