import type { FastifyPluginAsync } from "fastify";
import { listPricing } from "../modules/pricing/pricing.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const pricingRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/pricing", async (_, reply) => {
    try {
      const pricing = await listPricing();
      return okResponse(pricing);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected pricing error"));
    }
  });
};

export default pricingRoute;
