import type { FastifyPluginAsync } from "fastify";
import { listHealthTests } from "../modules/health-tests/health-tests.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const healthTestsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/health-tests", async (_, reply) => {
    try {
      const healthTests = await listHealthTests();
      return okResponse(healthTests);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected health tests error"));
    }
  });
};

export default healthTestsRoute;
