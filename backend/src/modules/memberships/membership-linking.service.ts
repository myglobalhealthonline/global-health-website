import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { sendMembershipEnrollmentConfirmedEmail } from "./membership-emails.js";
import { issueMembershipCard } from "./membership-card-issue.js";

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
export type LinkOptions = {
  /**
   * Enrollment ids whose §12.1 confirmation this call must NOT send, because
   * the caller is about to issue their card in the same flow (§25).
   *
   * Ids, not a boolean: linking is BY ADDRESS, so one call can attach
   * enrollments in other plans that the caller never touched, and those
   * confirmations must still go out.
   *
   * The caller has to say so — the linker cannot infer it. An uncarded row on
   * an ordinary login has no follow-up caller at all, so treating "uncarded"
   * as "someone else will handle it" would leave that member with no mail of
   * any kind.
   */
  suppressConfirmationFor?: ReadonlySet<string>;
};

export async function linkMembershipsForUser(
  userId: string,
  options: LinkOptions = {},
): Promise<LinkResult> {
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
      // Decides which mail this link sends: welcome+card for someone who has
      // never had one, the plain confirmation for someone who has (§25).
      cardIssuedAt: true,
      // Provenance, to tell a MEMBER-added dependent from every other row.
      // Both null = the member path (§10), the only one whose card this
      // function is responsible for issuing.
      memberType: true,
      createdByAdminId: true,
      importBatchId: true,
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

    // ONE mail per link (§25). Which one depends on two questions.
    //
    // A MEMBER-added dependent is the single row type whose card is THIS
    // function's job. `addMemberDependent` deliberately does not mail an
    // unverified, member-typed address, so the card waits here for the same
    // proof of ownership §5.2 already demands before the membership grants
    // anything. `memberType` is part of the test and not just the provenance
    // columns: only that path creates rows the member owns, and it only ever
    // creates DEPENDENTs — a PRIMARY with both columns null is an ordinary
    // enrollment from a path that simply never stamped them.
    //
    // This is also the ONLY branch here that renders, and that is load-bearing.
    // This function is on the email-verification and login paths, and a card is
    // a Chromium page — roughly a second, plus a browser launch on a cold
    // process. Rendering for every linking member would put that on every
    // member's first login. Every other row already holds its card by the time
    // it links, so the hot path stays clear.
    const memberAdded =
      candidate.memberType === "DEPENDENT" &&
      candidate.createdByAdminId === null &&
      candidate.importBatchId === null;

    if (candidate.cardIssuedAt === null && memberAdded) {
      await issueMembershipCard({ enrollmentId: candidate.id }).catch(() => undefined);
    } else if (!options.suppressConfirmationFor?.has(candidate.id)) {
      // Best-effort: a mail failure must never undo a successful link.
      await sendMembershipEnrollmentConfirmedEmail({
        to: user.email,
        firstName: candidate.firstName,
        planName: candidate.plan.name,
        levelName: candidate.level.name,
        membershipId: candidate.membershipId,
        enrollmentId: candidate.id,
      }).catch(() => undefined);
    }
  }

  return { linked: linkedIds.length, enrollmentIds: linkedIds };
}

/**
 * Same rule, entered from the enrollment side: an admin has just created or
 * imported a row, so link it immediately if that address already belongs to a
 * verified account. An unverified account is left alone — it links when it
 * verifies, which is exactly the hole §8.2 closes.
 */
export async function linkMembershipsForEmail(
  email: string,
  options: LinkOptions = {},
): Promise<LinkResult> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" }, emailVerifiedAt: { not: null } },
    select: { id: true },
  });
  if (!user) return EMPTY;
  return linkMembershipsForUser(user.id, options);
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
