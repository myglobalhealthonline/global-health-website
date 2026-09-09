import type { FastifyPluginAsync } from "fastify";
import { runWithSchedulerDb } from "../db/prisma.js";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { dispatchDueTrustpilotInvites } from "../modules/review-invites/review-invite.service.js";

/**
 * Compatibility cron endpoint for the unified review campaign scheduler.
 *
 *   POST /api/cron/trustpilot-invites
 *   Header: X-Cron-Token: <CRON_SECRET>
 *
 * Discovers eligible completed consultations and queues due campaign stages
 * in the existing outbox. Historical AFS rows are never dispatched. Unique
 * campaign/stage keys and delivery claims protect overlapping ticks.
 */
const trustpilotInvitesCronRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/cron/trustpilot-invites", async (request, reply) => {
    // Token check — fail CLOSED. If CRON_SECRET is unset the endpoint is
    // unconfigured and must refuse all callers (never run unauthenticated).
    const expected = env.CRON_SECRET;
    const provided = request.headers["x-cron-token"];
    if (!expected) {
      app.log.error("CRON_SECRET is not set — refusing cron request");
      return reply.status(503).send(errorResponse("Cron endpoint is not configured"));
    }
    if (!isValidCronSecret(provided, expected)) {
      return reply.status(401).send(errorResponse("Invalid cron token"));
    }

    return runWithSchedulerDb(async () => {
    try {
      const summary = await dispatchDueTrustpilotInvites();
      if (summary.sent > 0 || summary.skipped > 0) {
        app.log.info(summary, "Trustpilot invite dispatch");
      }
      return okResponse(summary);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Cron job failed"));
    }
    });
  });
};

export default trustpilotInvitesCronRoute;
