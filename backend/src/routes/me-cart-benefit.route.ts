import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { setCartBenefit } from "../modules/benefits/benefit-selection.service.js";
import { setCartBenefitSchema } from "../validations/me-cart-benefit.schema.js";

/**
 * `PUT /api/me/cart/benefit` — persist the cart-level benefit choice (§25).
 *
 * Auth required. Guests have no benefit to choose (§6): they book at full
 * price, and their cart stays `UNSET`, which §6.4 resolves to `NONE` at
 * checkout because no source is eligible for them.
 *
 * The cart is upserted rather than required, because the benefit step runs
 * before time selection (§11.2) — there is usually nothing in the cart yet.
 */
const meCartBenefitRoute: FastifyPluginAsync = async (app) => {
  app.put("/api/me/cart/benefit", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    const parsed = setCartBenefitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid benefit choice", parsed.error.flatten()));
    }
    try {
      const result = await setCartBenefit(user.id, {
        source: parsed.data.source,
        refId: parsed.data.refId ?? null,
      });
      if (!result.ok) {
        return reply.status(result.status).send(errorResponse(result.message));
      }
      return okResponse({
        source: result.source,
        membershipEnrollmentId: result.membershipEnrollmentId,
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not save the benefit choice"));
    }
  });
};

export default meCartBenefitRoute;
