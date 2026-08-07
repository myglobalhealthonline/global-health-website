import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { listBenefitOptions } from "../modules/benefits/benefit-options.service.js";
import { benefitOptionsQuerySchema } from "../validations/me-benefit-options.schema.js";

/**
 * `GET /api/me/benefit-options` — every benefit source the session user can use
 * for one service, each priced, cheapest first (§6.3).
 *
 * Auth required: guests get 401 so the booking step can render "log in to use a
 * membership, plan or corporate benefit" instead of an empty list, matching how
 * `/api/me/cart-preview` and `/api/me/benefit-preview` already behave.
 *
 * Read-only. Nothing is reserved or spent, and checkout re-derives every price
 * from the DB (§13.2) — so the worst a tampered response can do is cost the
 * patient the full price, never less.
 */
const meBenefitOptionsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/benefit-options", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    const parsed = benefitOptionsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid query", parsed.error.flatten()));
    }
    try {
      const result = await listBenefitOptions({
        userId: user.id,
        serviceId: parsed.data.serviceId,
        doctorId: parsed.data.doctorId ?? null,
        timeSlotId: parsed.data.timeSlotId ?? null,
        locale: parsed.data.locale ?? null,
      });
      // Unknown service, or one with no base price — nothing to price against.
      if (!result) return reply.status(404).send(errorResponse("Service not found"));
      return okResponse(result);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load benefit options"));
    }
  });
};

export default meBenefitOptionsRoute;
