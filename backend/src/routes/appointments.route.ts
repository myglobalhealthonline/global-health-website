import type { FastifyPluginAsync } from "fastify";
import { createAppointmentRequest } from "../modules/appointments/appointments.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { bookingSchema } from "../validations/booking.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

const appointmentsRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/appointments", async (request, reply) => {
    const parsed = bookingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(
        errorResponse("Invalid booking request", parsed.error.flatten()),
      );
    }

    try {
      await createAppointmentRequest(parsed.data);

      return okResponse(
        {
          status: "request_received",
        },
        "Request received. Our team will follow up.",
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected appointment error"));
    }
  });
};

export default appointmentsRoute;
