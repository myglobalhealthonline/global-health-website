import type { FastifyPluginAsync } from "fastify";
import { recordAudit } from "../modules/audit/audit.service.js";
import { verifyMembershipForStaff } from "../modules/memberships/membership-card.service.js";
import { requireManageMemberships } from "../utils/manage-memberships-auth.js";
import { membershipVerifyQuerySchema } from "../validations/me-membership.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Staff card verification (§10, §20).
 *
 * This is the *whole* verification story for the digital card: there is no
 * public verification URL, deliberately. Partner membership ids are often
 * sequential, so an unauthenticated endpoint that turns an id into a name and
 * a plan would be a member directory with a lookup form on the front.
 *
 * MANAGE_MEMBERSHIPS, same gate as the rest of the member surface — it returns
 * member PII. Every lookup is audited, hit or miss, for the same reason the
 * claim attempts are: the probed ids are the enumeration signal.
 */
const adminMembershipVerifyRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/membership-verify", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;

    const query = membershipVerifyQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid membership id", query.error.flatten()));
    }

    const result = await verifyMembershipForStaff(query.data.membershipId);

    recordAudit({
      actorUserId: auth.actorUserId,
      actorRole: auth.actorRole,
      action: "MEMBERSHIP_VERIFY_LOOKUP",
      entityType: "MembershipClaimAttempt",
      entityId: query.data.membershipId.toLowerCase(),
      metadata: { found: result !== null },
      request,
    }).catch(() => {});

    // A miss is a 200 with `found: false`, not a 404: staff are checking a card
    // in front of them, and "no such membership" is a valid answer to render,
    // not an error to handle.
    return okResponse(result ?? { found: false as const });
  });
};

export default adminMembershipVerifyRoute;
