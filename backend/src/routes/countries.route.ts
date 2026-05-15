import type { FastifyPluginAsync } from "fastify";
import { listCountries } from "../modules/countries/countries.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const countriesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/countries", async (_, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=120, s-maxage=120, stale-while-revalidate=600",
    );
    try {
      const countries = await listCountries();
      return okResponse(countries);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected countries error"));
    }
  });
};

export default countriesRoute;
