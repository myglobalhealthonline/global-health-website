import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { runPostPaymentReminderCron } from "../modules/automation/post-payment-flow.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const postPaymentRemindersRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/internal/run-post-payment-reminders", async (request, reply) => {
    if (!env.CRON_SECRET) {
      return reply.status(503).send(errorResponse("Post-payment reminder runner is not configured"));
    }
    const provided = request.headers["x-cron-secret"];
    if (!isValidCronSecret(provided, env.CRON_SECRET)) {
      return reply.status(401).send(errorResponse("Not authorised"));
    }

    try {
      const result = await runPostPaymentReminderCron();
      return okResponse(
        result,
        `Post-payment run: ${result.meetingLinkSent} meeting link, ${result.oneHourSent} 1h, ${result.fiveMinSent} 5min.`,
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not run post-payment reminders"));
    }
  });
};

export default postPaymentRemindersRoute;
