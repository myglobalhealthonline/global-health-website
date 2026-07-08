import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  cancelAfterGrace,
  sendDueRenewalReminders,
  sweepExpiredReservations,
} from "../modules/subscriptions/ops/sweep.service.js";

/**
 * Subscription ops crons (§28/§39). Token-gated (X-Cron-Token: <CRON_SECRET>),
 * fail CLOSED. No customer dunning email here — Stripe owns dunning (§38.5).
 *
 * TWO endpoints with DIFFERENT cadences (configure the external scheduler to
 * match — getting the cadence wrong on the daily one would spam reminders):
 *   POST /api/cron/subscriptions        — every ~5 min: reservation sweep + cancel-after-grace
 *   POST /api/cron/subscriptions/daily  — once a day:   renewal reminders (24h dedup window)
 */
const cronSubscriptionsRoute: FastifyPluginAsync = async (app) => {
  const checkToken = (request: FastifyRequest, reply: FastifyReply): boolean => {
    const expected = env.CRON_SECRET;
    const provided = request.headers["x-cron-token"];
    if (!expected) {
      app.log.error("CRON_SECRET is not set — refusing subscription cron");
      reply.status(503).send(errorResponse("Cron endpoint is not configured"));
      return false;
    }
    if (!isValidCronSecret(provided, expected)) {
      reply.status(401).send(errorResponse("Invalid cron token"));
      return false;
    }
    return true;
  };

  // Every ~5 minutes.
  app.post("/api/cron/subscriptions", async (request, reply) => {
    if (!checkToken(request, reply)) return;
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
      app.log.error(err, "Subscription cron failed");
      return reply.status(500).send(errorResponse("Subscription cron failed"));
    }
  });

  // Once a day. The 24h match window dedups; running this more than once a day
  // would send duplicate reminders.
  app.post("/api/cron/subscriptions/daily", async (request, reply) => {
    if (!checkToken(request, reply)) return;
    try {
      const { remindersSent } = await sendDueRenewalReminders();
      return okResponse({ remindersSent });
    } catch (err) {
      app.log.error(err, "Subscription daily cron failed");
      return reply.status(500).send(errorResponse("Subscription daily cron failed"));
    }
  });
};

export default cronSubscriptionsRoute;
