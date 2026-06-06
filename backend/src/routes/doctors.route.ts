import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { listDoctors } from "../modules/doctors/doctors.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { localeCodeSchema } from "../validations/admin-countries.schema.js";

const doctorsQuerySchema = z.object({
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    localeCodeSchema.optional(),
  ),
});

const doctorsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctors", async (request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    const query = doctorsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid doctors query", query.error.flatten()));
    }
    try {
      const doctors = await listDoctors(query.data.locale);
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
