import type { FastifyPluginAsync } from "fastify";
import {
  getAppointmentById,
  InvalidAppointmentStatusTransitionError,
  listAppointments,
  UnrecognizedAppointmentStatusError,
  updateAppointmentStatus,
} from "../modules/appointments/appointments.service.js";
import { env } from "../config/env.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminAppointmentsQuerySchema,
  appointmentIdParamsSchema,
  updateAppointmentStatusBodySchema,
} from "../validations/admin-appointments.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

function verifyAdminToken(authorizationHeader: string | undefined) {
  const expectedToken = env.ADMIN_API_TOKEN;
  if (!expectedToken) {
    return { ok: false as const, status: 503, message: "Admin auth is not configured" };
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, message: "Missing bearer token" };
  }

  const providedToken = authorizationHeader.slice("Bearer ".length).trim();
  if (providedToken.length === 0 || providedToken !== expectedToken) {
    return { ok: false as const, status: 401, message: "Invalid admin token" };
  }

  return { ok: true as const };
}

const adminAppointmentsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = verifyAdminToken(request.headers.authorization);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/appointments", async (request, reply) => {
    const query = adminAppointmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointments query", query.error.flatten()));
    }

    try {
      const data = await listAppointments({
        page: query.data.page,
        pageSize: query.data.pageSize,
        status: query.data.status,
        countryCode: query.data.countryCode,
        consultationType: query.data.consultationType,
        search: query.data.search,
      });
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointments error"));
    }
  });

  app.get("/api/admin/appointments/:id", async (request, reply) => {
    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }

    try {
      const appointment = await getAppointmentById(params.data.id);
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      return okResponse({ appointment });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointment error"));
    }
  });

  app.patch("/api/admin/appointments/:id/status", async (request, reply) => {
    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }

    const body = updateAppointmentStatusBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid appointment status update", body.error.flatten()));
    }

    try {
      const appointment = await updateAppointmentStatus(params.data.id, body.data.status);
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      return okResponse({ appointment }, "Appointment status updated");
    } catch (error) {
      if (error instanceof InvalidAppointmentStatusTransitionError) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof UnrecognizedAppointmentStatusError) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointment update error"));
    }
  });
};

export default adminAppointmentsRoute;
