import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAuthToken } from "../utils/auth-session.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  getMemberMembership,
  listMemberMemberships,
} from "../modules/memberships/membership-card.service.js";
import {
  confirmMembershipClaim,
  requestMembershipClaim,
} from "../modules/memberships/membership-claim.service.js";
import {
  buildCardContentFromRow,
  cardContentSelect,
  cardStatusLabel,
  resolveCardLocale,
} from "../modules/memberships/membership-card-content.js";
import { membershipCardCopy } from "../modules/memberships/membership-emails.js";
import {
  membershipCardFilename,
  renderMembershipCardPng,
} from "../modules/memberships/membership-card-image.js";
import {
  MembershipDependentError,
  MembershipEnrollmentConflictError,
  MembershipEnrollmentNotFoundError,
  addMemberDependent,
  removeMemberDependent,
} from "../modules/memberships/membership-enrollments.service.js";
import {
  memberDependentCreateSchema,
  membershipClaimConfirmSchema,
  membershipClaimSchema,
} from "../validations/me-membership.schema.js";

/**
 * Member-facing private-membership endpoints
 * (docs/plans/private-membership-plans-implementation.md §10, phase 3).
 *
 * Everything is scoped to the session user's own enrollments. There is no
 * public verification URL (§20) — the only lookup by membership id is the
 * admin-session staff check in `admin-membership-verify.route.ts`.
 */

/** One generic string for every claim outcome. See `claimRateLimit` below. */
const CLAIM_GENERIC =
  "If those details match a membership, we've sent a confirmation link to the email on file.";

/**
 * Per-user AND per-IP, 5/hour (§5.3). The bucket has to be derived from the
 * cookie here rather than from `request.authUser`: rate limiting runs on
 * `onRequest`, which is before the `preHandler` that sets `authUser`, so it is
 * always undefined at this point. Falling back to the IP key keeps an
 * unauthenticated or cookie-less caller bounded too.
 */
const claimRateLimit = {
  max: 5,
  timeWindow: "1 hour",
  skipOnError: false,
  keyGenerator: (request: FastifyRequest) => {
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    // nosemgrep: gh-route-raw-token-verify -- not an identity check: `requireAuth` is this plugin's preHandler and is the real gate on every route here. This read only picks a rate-limit bucket, and it runs on onRequest, before that preHandler, so `request.authUser` does not exist yet. An invalid or forged cookie simply falls back to the IP bucket and is then rejected by requireAuth.
    const payload = token ? verifyAuthToken(token) : null;
    // Both dimensions in one key: a single account cannot spread its attempts
    // over many IPs, and a single IP cannot spread them over many accounts.
    return payload ? `membership-claim:${payload.sub}:${request.ip}` : `membership-claim:${request.ip}`;
  },
};

const meMembershipRoute: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  /** Every membership this account holds (§19 allows several). */
  app.get("/api/me/memberships", async (request) => {
    const userId = request.authUser!.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    return okResponse(await listMemberMemberships(userId, user?.preferredLocale ?? null));
  });

  app.get<{ Params: { id: string } }>("/api/me/memberships/:id", async (request, reply) => {
    const userId = request.authUser!.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    const view = await getMemberMembership(userId, request.params.id, user?.preferredLocale ?? null);
    // Identical answer for "no such enrollment" and "not yours".
    if (!view) return reply.status(404).send(errorResponse("Membership not found"));
    return okResponse(view);
  });

  /**
   * The card as a downloadable PNG — the same render that goes out with the
   * welcome email, so what a member saves to a wallet app matches what they
   * were sent. Scoped to the caller's own enrollments exactly like the read
   * above: someone else's id is a 404, not a card.
   */
  app.get<{ Params: { id: string } }>("/api/me/memberships/:id/card.png", async (request, reply) => {
    const row = await prisma.membershipEnrollment.findFirst({
      where: { id: request.params.id, userId: request.authUser!.sub, status: { not: "REMOVED" } },
      select: cardContentSelect,
    });
    if (!row) return reply.status(404).send(errorResponse("Membership not found"));

    const copy = membershipCardCopy(resolveCardLocale(row));
    const content = buildCardContentFromRow(row, copy);
    const png = await renderMembershipCardPng(content, copy, cardStatusLabel(content, copy));

    return reply
      .header("Content-Type", "image/png")
      .header(
        "Content-Disposition",
        `attachment; filename="${membershipCardFilename(content.membershipId)}"`,
      )
      // A card is per-member data behind a session — never a shared cache.
      .header("Cache-Control", "private, no-store")
      .send(png);
  });

  /**
   * Claim, step 1 (§5.3). Mails a single-use confirmation link to the
   * ENROLLED address. The response never varies with whether a row matched —
   * partner ids are often sequential, so any variation is an enumeration
   * oracle.
   */
  app.post(
    "/api/me/memberships/claim",
    { config: { rateLimit: claimRateLimit } },
    async (request, reply) => {
      const body = membershipClaimSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid request", body.error.flatten()));
      }

      const outcome = await requestMembershipClaim({
        userId: request.authUser!.sub,
        membershipId: body.data.membershipId,
        email: body.data.email,
        request,
      });

      // A fact about the caller's OWN account, so saying it plainly leaks
      // nothing about any membership.
      if (outcome.status === "email_not_verified") {
        return reply
          .status(403)
          .send(errorResponse("Verify your email address before claiming a membership."));
      }
      return okResponse({ sent: true }, CLAIM_GENERIC);
    },
  );

  /**
   * Claim, step 2.
   *
   * **POST, not the `GET …/confirm?token=` §5.3 sketches.** The token is
   * single-use, and corporate mail scanners (SafeLinks, Proofpoint and
   * friends) fetch every link in an inbound message — a GET here would let a
   * scanner burn the token before the member ever clicks, turning a working
   * claim into a dead one. The frontend confirm page reads the token from the
   * URL and POSTs it behind an explicit button, which preserves the property
   * that actually matters: the link is opened by the session that asked for it.
   */
  app.post("/api/me/memberships/claim/confirm", async (request, reply) => {
    const body = membershipClaimConfirmSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid or expired confirmation link"));
    }

    const outcome = await confirmMembershipClaim({
      userId: request.authUser!.sub,
      token: body.data.token,
      request,
    });
    if (outcome.status === "rejected") {
      // One message for every rejection reason — an expired token and someone
      // else's token must not be distinguishable.
      return reply.status(400).send(errorResponse("Invalid or expired confirmation link"));
    }
    return okResponse({
      enrollmentId: outcome.enrollmentId,
      status: outcome.enrollmentStatus,
    });
  });

  /** Member-added dependents, capped by the level (§10). */
  app.post<{ Params: { id: string } }>(
    "/api/me/memberships/:id/dependents",
    async (request, reply) => {
      const body = memberDependentCreateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid request", body.error.flatten()));
      }
      try {
        const created = await addMemberDependent(request.authUser!.sub, request.params.id, body.data);
        await recordAudit({
          action: "MEMBERSHIP_DEPENDENT_ADDED",
          entityType: "MembershipEnrollment",
          entityId: created!.id,
          actorUserId: request.authUser!.sub,
          metadata: { primaryEnrollmentId: request.params.id },
          request,
        });
        return reply.status(201).send(okResponse(created));
      } catch (error) {
        if (error instanceof MembershipEnrollmentNotFoundError) {
          return reply.status(404).send(errorResponse("Membership not found"));
        }
        if (error instanceof MembershipDependentError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof MembershipEnrollmentConflictError) {
          return reply.status(409).send(errorResponse(error.message));
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/me/memberships/dependents/:id",
    async (request, reply) => {
      try {
        const removed = await removeMemberDependent(request.authUser!.sub, request.params.id);
        await recordAudit({
          action: "MEMBERSHIP_DEPENDENT_REMOVED",
          entityType: "MembershipEnrollment",
          entityId: removed.id,
          actorUserId: request.authUser!.sub,
          metadata: { membershipId: removed.membershipId },
          request,
        });
        return okResponse({ id: removed.id });
      } catch (error) {
        if (error instanceof MembershipEnrollmentNotFoundError) {
          return reply.status(404).send(errorResponse("Dependent not found"));
        }
        throw error;
      }
    },
  );
};

export default meMembershipRoute;
