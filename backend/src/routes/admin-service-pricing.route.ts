import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  getServicePeakConfig,
  upsertServicePeakConfig,
} from "../modules/pricing/peak-pricing.service.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { peakPricingSchema } from "../validations/admin-service-pricing.schema.js";

/**
 * Admin read/write of a service's fixed peak-hour pricing config.
 *
 *   GET /api/admin/services/:id/peak-pricing  → config | null
 *   PUT /api/admin/services/:id/peak-pricing  → upserted config
 */
const adminServicePricingRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/admin/services/:id/peak-pricing",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      try {
        const config = await getServicePeakConfig(request.params.id);
        return okResponse({ config });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not read peak pricing"));
      }
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/admin/services/:id/peak-pricing",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const parsed = peakPricingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid peak pricing", parsed.error.flatten()));
      }
      try {
        const service = await prisma.service.findUnique({
          where: { id: request.params.id },
          select: { id: true },
        });
        if (!service) {
          return reply.status(404).send(errorResponse("Service not found"));
        }
        const config = await upsertServicePeakConfig(
          request.params.id,
          parsed.data,
        );
        return okResponse({ config }, "Peak pricing saved");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save peak pricing"));
      }
    },
  );
};

export default adminServicePricingRoute;
