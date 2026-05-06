import type { FastifyPluginAsync } from "fastify";
import { getAppointmentForUser, listAppointmentsForUser } from "../modules/appointments/appointments.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import {
  accountAppointmentIdParamSchema,
  accountAppointmentsQuerySchema,
} from "../validations/account-appointments.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";

const accountAppointmentsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/account/appointments", async (request, reply) => {
    let authUser: SafeUser | null = null;
    try {
      authUser = await resolveOptionalAuthUser(request);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
    if (!authUser) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    if (authUser.role !== "PATIENT" && authUser.role !== "ADMIN") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    const query = accountAppointmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid appointments query", query.error.flatten()));
    }

    const targetUserId =
      authUser.role === "ADMIN" ? (query.data.userId ?? authUser.id) : authUser.id;

    try {
      const items = await listAppointmentsForUser(targetUserId);
      return okResponse({ items });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected appointment error"));
    }
  });

  app.get("/api/account/appointments/:id", async (request, reply) => {
    let authUser: SafeUser | null = null;
    try {
      authUser = await resolveOptionalAuthUser(request);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
    if (!authUser) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    if (authUser.role !== "PATIENT" && authUser.role !== "ADMIN") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    const params = accountAppointmentIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid appointment id", params.error.flatten()));
    }

    const query = accountAppointmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid appointments query", query.error.flatten()));
    }

    const targetUserId =
      authUser.role === "ADMIN" ? (query.data.userId ?? authUser.id) : authUser.id;

    try {
      const appointment = await getAppointmentForUser(params.data.id, targetUserId);
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      return okResponse({ appointment });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected appointment error"));
    }
  });
};

export default accountAppointmentsRoute;

