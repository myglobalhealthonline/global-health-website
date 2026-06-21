import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  approvePerkGrant,
  listPerkGrants,
  PerkGrantNotFoundError,
} from "../modules/plans/perk-grants.service.js";
import {
  perkGrantIdParamsSchema,
  perkGrantsQuerySchema,
} from "../validations/admin-plans.schema.js";
import { requireManageSubscriptions } from "../utils/manage-subscriptions-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleError(app: { log: { error: (e: unknown) => void } }, reply: FastifyReply, error: unknown) {
  if (error instanceof PerkGrantNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected perk-grants error"));
}

/** Per-subscriber manual-approval queue (§36.13). */
const adminSubscriptionPerkGrantsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/subscription-perk-grants", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const query = perkGrantsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }
    try {
      return okResponse({ grants: await listPerkGrants(query.data.status) });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.post("/api/admin/subscription-perk-grants/:id/approve", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = perkGrantIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid grant id"));
    try {
      const grant = await approvePerkGrant(params.data.id, auth.actorUserId);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PERK_MANUALLY_APPROVED",
        entityType: "SubscriptionPerkGrant",
        entityId: grant.id,
        metadata: { userSubscriptionId: grant.userSubscriptionId, perkKey: grant.perkKey },
        request,
      }).catch(() => {});
      return okResponse({ grant }, "Perk grant approved");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });
};

export default adminSubscriptionPerkGrantsRoute;
