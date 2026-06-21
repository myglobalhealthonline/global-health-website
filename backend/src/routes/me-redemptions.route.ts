import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  RedemptionError,
  listRedemptions,
  startRedemption,
} from "../modules/subscriptions/redemption.service.js";

/**
 * Wellness-credit redemption API (Phase 5, contracts.md). Auth required (D15).
 *   GET  /api/me/redemptions → eligible kits + progress
 *   POST /api/me/redemptions → reserve credits + stock, shipping Checkout URL
 */

const redeemBodySchema = z.object({
  healthTestId: z.string().trim().min(1).max(120),
  shipName: z.string().trim().min(2).max(120),
  shipLine1: z.string().trim().min(2).max(200),
  shipLine2: z.string().trim().max(200).optional().or(z.literal("")),
  shipCity: z.string().trim().min(1).max(120),
  shipPostalCode: z.string().trim().min(1).max(40),
  shipCountryCode: z.string().trim().min(2).max(4),
  returnTo: z
    .string()
    .trim()
    .regex(/^\/[a-z0-9/-]*$/i)
    .max(200)
    .optional(),
});

function statusForRedemptionError(code: RedemptionError["code"]): number {
  switch (code) {
    case "NO_ACTIVE_SUBSCRIPTION":
    case "NOT_REDEEMABLE":
      return 404;
    case "INSUFFICIENT_CREDITS":
    case "OUT_OF_STOCK":
      return 409;
    case "NOT_ELIGIBLE":
    default:
      return 403;
  }
}

const meRedemptionsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/redemptions", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    try {
      return okResponse(await listRedemptions(user.id));
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load redemptions"));
    }
  });

  app.post(
    "/api/me/redemptions",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const user = await resolveOptionalAuthUser(request);
      if (!user || user.role !== "PATIENT") {
        return reply.status(401).send(errorResponse("Authentication required"));
      }
      const body = redeemBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid request", body.error.flatten()));
      }
      try {
        const result = await startRedemption({
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          healthTestId: body.data.healthTestId,
          ship: {
            name: body.data.shipName,
            line1: body.data.shipLine1,
            line2: body.data.shipLine2 || null,
            city: body.data.shipCity,
            postalCode: body.data.shipPostalCode,
            countryCode: body.data.shipCountryCode,
          },
          returnTo: body.data.returnTo,
        });
        return okResponse(result);
      } catch (err) {
        if (err instanceof RedemptionError) {
          return reply
            .status(statusForRedemptionError(err.code))
            .send(errorResponse(err.message, { code: err.code }));
        }
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not start redemption"));
      }
    },
  );
};

export default meRedemptionsRoute;
