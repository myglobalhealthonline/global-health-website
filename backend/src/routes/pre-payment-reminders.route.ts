import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import {
  runPrePaymentCancelSweep,
  runPrePaymentReminderCron,
  runWebCheckoutAbandonNudge,
} from "../modules/automation/pre-payment-flow.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const prePaymentRemindersRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/internal/run-pre-payment-reminders", async (request, reply) => {
    if (!env.CRON_SECRET) {
      return reply.status(503).send(errorResponse("Pre-payment reminder runner is not configured"));
    }
    const provided = request.headers["x-cron-secret"];
    if (!isValidCronSecret(provided, env.CRON_SECRET)) {
      return reply.status(401).send(errorResponse("Not authorised"));
    }

    try {
      // Deadline cancels first, and before the reminders: this endpoint is the
      // fallback for when the internal scheduler isn't running, so it has to
      // cover both jobs, and a cancel must not queue behind a batch of
      // serialized reminder sends.
      const cancels = await runPrePaymentCancelSweep();
      const abandoned = await runWebCheckoutAbandonNudge();
      const result = await runPrePaymentReminderCron();
      return okResponse(
        {
          ...result,
          cancelled: cancels.cancelled,
          cancelCandidates: cancels.candidates,
          webCheckoutNudged: abandoned.sent,
        },
        `Pre-payment run: ${cancels.cancelled} cancelled, ${abandoned.sent} checkout-abandon nudge(s), ${result.sent} stage(s) sent.`,
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not run pre-payment reminders"));
    }
  });
};

export default prePaymentRemindersRoute;
