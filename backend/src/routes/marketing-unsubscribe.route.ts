import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { BIRTHDAY_UNSUBSCRIBE_TOKEN_MAX_LENGTH, unsubscribeBirthdayMarketing } from "../modules/coupons/birthday-unsubscribe.js";
import { errorResponse, okResponse } from "../utils/response.js";

const bodySchema = z.object({ token: z.string().min(1).max(BIRTHDAY_UNSUBSCRIBE_TOKEN_MAX_LENGTH) });

const marketingUnsubscribeRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/marketing/unsubscribe", {
    bodyLimit: 1024,
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const body = bodySchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send(errorResponse("This unsubscribe link is invalid."));
    try {
      if (!await unsubscribeBirthdayMarketing(body.data.token)) {
        return reply.code(400).send(errorResponse("This unsubscribe link is invalid."));
      }
      return okResponse({ unsubscribed: true });
    } catch {
      // Database exceptions can contain email addresses. Never log the exception or token.
      return reply.code(503).send(errorResponse("Unable to unsubscribe right now. Please try again."));
    }
  });
};

export default marketingUnsubscribeRoute;
