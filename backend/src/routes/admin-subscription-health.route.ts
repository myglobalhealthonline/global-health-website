import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { runReconciliation } from "../modules/subscriptions/ops/reconciliation.service.js";

/**
 * GET /api/admin/subscription-health (§39, contracts.md) — the latest
 * reconciliation diff + open invariant alerts + price-sync failures for the
 * Sprint 2 admin health panel. Read-only, admin-gated.
 */
const adminSubscriptionHealthRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/subscription-health", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      return okResponse(await runReconciliation());
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load subscription health"));
    }
  });
};

export default adminSubscriptionHealthRoute;
