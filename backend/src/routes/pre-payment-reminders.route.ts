import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { runPrePaymentReminderCron } from "../modules/automation/pre-payment-flow.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const prePaymentRemindersRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/internal/run-pre-payment-reminders", async (request, reply) => {
    if (!env.CRON_SECRET) {
      return reply.status(503).send(errorResponse("Pre-payment reminder runner is not configured"));
    }
    const provided = request.headers["x-cron-secret"];
    if (typeof provided !== "string" || provided !== env.CRON_SECRET) {
      return reply.status(401).send(errorResponse("Not authorised"));
    }

    try {
      const result = await runPrePaymentReminderCron();
      return okResponse(result, `Pre-payment reminder run: ${result.sent} stage(s) sent.`);
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
