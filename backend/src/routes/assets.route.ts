import type { FastifyPluginAsync } from "fastify";
import { listAssets } from "../modules/assets/assets.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const assetsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/assets", async (_, reply) => {
    try {
      const assets = await listAssets();
      return okResponse(assets);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected assets error"));
    }
  });
};

export default assetsRoute;
