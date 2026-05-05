import type { FastifyPluginAsync } from "fastify";
import { listServices } from "../modules/services/services.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const servicesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/services", async (_, reply) => {
    try {
      const services = await listServices();
      return okResponse(services);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected services error"));
    }
  });
};

export default servicesRoute;
