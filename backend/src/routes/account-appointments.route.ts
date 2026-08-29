import type { FastifyPluginAsync } from "fastify";
import {
  AppointmentAlreadyStartedError,
  BookingUnavailableError,
  AppointmentNotOwnedError,
  cancelAppointmentForPatient,
  getAppointmentForReschedule,
  getAppointmentForUser,
  listAppointmentsForUser,
  rescheduleAppointmentForPatient,
  RescheduleDoctorMismatchError,
} from "../modules/appointments/appointments.service.js";
import {
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "../modules/appointments/appointment-status-transitions.js";
import { SlotAlreadyTakenError } from "../modules/doctor-availability/doctor-availability.service.js";
import { applyRescheduleSideEffects } from "../modules/appointments/reschedule-side-effects.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import {
  accountAppointmentCancelBodySchema,
  accountAppointmentIdParamSchema,
  accountAppointmentRescheduleBodySchema,
  accountAppointmentsQuerySchema,
} from "../validations/account-appointments.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";

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

  // Patient self-service: minimal detail to drive the reschedule picker
  // (which doctor's availability to fetch, and the currently-held slot).
  app.get("/api/account/appointments/:id/reschedule", async (request, reply) => {
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
    if (authUser.role !== "PATIENT") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    const params = accountAppointmentIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid appointment id", params.error.flatten()));
    }

    try {
      const appointment = await getAppointmentForReschedule(params.data.id, authUser.id);
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

  // Patient self-service cancel. ADMIN is intentionally excluded here —
  // admin cancellation already goes through /api/admin/appointments/:id/status
  // with its own audit trail; this route is patient-owned only.
  app.post("/api/account/appointments/:id/cancel", async (request, reply) => {
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
    if (authUser.role !== "PATIENT") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    const params = accountAppointmentIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid appointment id", params.error.flatten()));
    }
    const body = accountAppointmentCancelBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid request body", body.error.flatten()));
    }

    try {
      const appointment = await cancelAppointmentForPatient(params.data.id, authUser.id);
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      recordAudit({
        actorUserId: authUser.id,
        actorRole: "PATIENT",
        action: "APPOINTMENT_STATUS_CHANGED",
        entityType: "Appointment",
        entityId: appointment.id,
        metadata: { to: "CANCELLED", reason: body.data.reason ?? null },
        request,
      }).catch(() => {});
      return okResponse({ appointment });
    } catch (error) {
      if (error instanceof AppointmentNotOwnedError) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      if (
        error instanceof InvalidAppointmentStatusTransitionError ||
        error instanceof UnrecognizedAppointmentStatusError
      ) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not cancel appointment"));
    }
  });

  // Patient self-service reschedule — same doctor, new slot. Mirrors the
  // /cancel route's auth/ownership pattern; ADMIN reschedule already goes
  // through /api/admin/appointments/:id/schedule with its own audit trail.
  app.patch("/api/account/appointments/:id/reschedule", async (request, reply) => {
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
    if (authUser.role !== "PATIENT") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    const params = accountAppointmentIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid appointment id", params.error.flatten()));
    }
    const body = accountAppointmentRescheduleBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid request body", body.error.flatten()));
    }

    try {
      const appointment = await rescheduleAppointmentForPatient(
        params.data.id,
        authUser.id,
        body.data.newTimeSlotId,
      );
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      recordAudit({
        actorUserId: authUser.id,
        actorRole: "PATIENT",
        action: "APPOINTMENT_RESCHEDULED",
        entityType: "Appointment",
        entityId: appointment.id,
        metadata: { newTimeSlotId: body.data.newTimeSlotId },
        request,
      }).catch(() => {});

      // A self-service move gets the same treatment as an admin one: new Meet
      // link written to the order + every linked appointment (so all portals
      // show it), reminder ladder re-armed on the new time, and the patient +
      // doctor told. No change reason — the patient moved it themselves.
      const sideEffects = await applyRescheduleSideEffects({
        appointmentId: appointment.id,
        timeChanged: true,
        changeReason: "",
      }).catch(() => null);

      // Re-read so the response carries the regenerated Meet link rather than
      // the one that belonged to the old calendar event.
      const refreshed = sideEffects?.meetRegenerated
        ? await getAppointmentForUser(appointment.id, authUser.id)
        : null;
      return okResponse({ appointment: refreshed ?? appointment });
    } catch (error) {
      if (error instanceof AppointmentNotOwnedError) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      if (error instanceof SlotAlreadyTakenError) {
        return reply.status(409).send(errorResponse(error.message));
      }
      if (error instanceof BookingUnavailableError) {
        return reply.status(409).send(errorResponse(error.message));
      }
      if (
        error instanceof RescheduleDoctorMismatchError ||
        error instanceof AppointmentAlreadyStartedError
      ) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (
        error instanceof InvalidAppointmentStatusTransitionError ||
        error instanceof UnrecognizedAppointmentStatusError
      ) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not reschedule appointment"));
    }
  });
};

export default accountAppointmentsRoute;

