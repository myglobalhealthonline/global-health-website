import type { FastifyPluginAsync } from "fastify";
import { createAppointmentWithOptionalOwner } from "../modules/appointments/appointments.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { bookingSchema } from "../validations/booking.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";

const appointmentsRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/appointments", async (request, reply) => {
    const parsed = bookingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(
        errorResponse("Invalid booking request", parsed.error.flatten()),
      );
    }

    try {
      let authUserId: string | null = null;
      try {
        const authUser = await resolveOptionalAuthUser(request);
        authUserId = authUser?.id ?? null;
      } catch (error) {
        app.log.warn(error, "Unable to resolve booking owner from auth cookie; proceeding as guest booking");
      }

      await createAppointmentWithOptionalOwner(parsed.data, { userId: authUserId });

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
