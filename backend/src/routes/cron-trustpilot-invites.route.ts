import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { dispatchDueTrustpilotInvites } from "../modules/review-invites/review-invite.service.js";

/**
 * Cron-triggered dispatch of Trustpilot review invitations.
 *
 *   POST /api/cron/trustpilot-invites
 *   Header: X-Cron-Token: <CRON_SECRET>
 *
 * Appointments finalised for a doctor with `trustpilotInviteEnabled` leave a
 * ReviewInvite row scheduled 24h after the consultation ended. This endpoint
 * turns the due ones into Trustpilot AFS triggers; Trustpilot then emails the
 * patient. Point Railway cron at it hourly — the 24h delay lives on the row,
 * so tick frequency only affects punctuality, never correctness.
 *
 * Runs are idempotent: a row is claimed by stamping `dispatchedAt`, so an
 * overlapping tick re-reads it as already handled.
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
};

export default trustpilotInvitesCronRoute;
