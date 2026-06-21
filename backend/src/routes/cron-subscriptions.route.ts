import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  cancelAfterGrace,
  sweepExpiredReservations,
} from "../modules/subscriptions/ops/sweep.service.js";

/**
 * Subscription ops cron (§28/§39). Pointed at by the external scheduler:
 *   POST /api/cron/subscriptions   Header: X-Cron-Token: <CRON_SECRET>
 *
 * Runs the reservation-release sweep (every ~5 min) + cancel-after-grace.
 * Token-gated, fails CLOSED. No customer dunning email is sent here (Stripe
 * owns dunning, §38.5).
 */
const cronSubscriptionsRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/cron/subscriptions", async (request, reply) => {
    const expected = env.CRON_SECRET;
    const provided = request.headers["x-cron-token"];
    if (!expected) {
      app.log.error("CRON_SECRET is not set — refusing subscription cron");
      return reply.status(503).send(errorResponse("Cron endpoint is not configured"));
    }
    if (provided !== expected) {
      return reply.status(401).send(errorResponse("Invalid cron token"));
    }

    try {
      const [sweep, grace] = await Promise.all([
        sweepExpiredReservations(),
        cancelAfterGrace(),
      ]);
      return okResponse({
        consultationReleased: sweep.consultationReleased,
        wellnessReleased: sweep.wellnessReleased,
        canceledAfterGrace: grace.canceled,
      });
    } catch (err) {
      // Fail closed: surface the error so the scheduler retries (§39).
      app.log.error(err, "Subscription cron failed");
      return reply.status(500).send(errorResponse("Subscription cron failed"));
    }
  });
};

export default cronSubscriptionsRoute;
