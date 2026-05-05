import type { FastifyPluginAsync } from "fastify";
import { listDoctors } from "../modules/doctors/doctors.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const doctorsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctors", async (_, reply) => {
    try {
      const doctors = await listDoctors();
      return okResponse(doctors);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected doctors error"));
    }
  });
};

export default doctorsRoute;
