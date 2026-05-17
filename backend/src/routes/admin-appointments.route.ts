import type { FastifyPluginAsync } from "fastify";
import {
  getAppointmentById,
  InvalidAppointmentStatusTransitionError,
  listAppointments,
  scheduleAppointment,
  UnrecognizedAppointmentStatusError,
  updateAppointmentStatus,
} from "../modules/appointments/appointments.service.js";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { sendAppointmentScheduledEmail } from "../lib/email/templates.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { notifyDoctor } from "../modules/notifications/notify.service.js";
import {
  adminAppointmentsQuerySchema,
  appointmentIdParamsSchema,
  scheduleAppointmentBodySchema,
  updateAppointmentStatusBodySchema,
} from "../validations/admin-appointments.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

const adminAppointmentsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
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

  // Schedule (or reschedule) the call. Sets `scheduledAt` + `meetingUrl`,
  // then fires a SendGrid email with the Meet link if both ended up set.
  // The email failure is logged but doesn't fail the request — admin can
  // resend manually if SendGrid is misconfigured.
  app.patch("/api/admin/appointments/:id/schedule", async (request, reply) => {
    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }
    const body = scheduleAppointmentBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid schedule payload", body.error.flatten()));
    }

    // Normalise empty-string -> null so admins can clear fields via the
    // text inputs they'll see in the admin form.
    const meetingUrlInput =
      body.data.meetingUrl === undefined
        ? undefined
        : body.data.meetingUrl === "" || body.data.meetingUrl === null
          ? null
          : body.data.meetingUrl;
    const scheduledAtInput =
      body.data.scheduledAt === undefined
        ? undefined
        : body.data.scheduledAt === null
          ? null
          : new Date(body.data.scheduledAt);

    // Doctor assignment goes through the same endpoint to keep the
    // "schedule call" admin form a single round-trip. `null` clears the
    // assignment; `undefined` leaves it alone.
    const doctorIdInput = body.data.doctorId ?? undefined;

    try {
      // Snapshot the pre-update values so we can detect whether the slot or
      // URL actually changed. Without this guard the email re-fires every
      // time the admin saves the form, even on unrelated edits.
      const before = await getAppointmentById(params.data.id);
      // Also snapshot the previous doctor assignment so we can fire a
      // notification when the doctor changes (not on every save).
      const beforeDoctorId = before
        ? (
            await prisma.appointment.findUnique({
              where: { id: params.data.id },
              select: { doctorId: true },
            })
          )?.doctorId ?? null
        : null;

      const appointment = await scheduleAppointment(params.data.id, {
        scheduledAt: scheduledAtInput,
        meetingUrl: meetingUrlInput,
        doctorId: doctorIdInput,
      });
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }

      // Fire the schedule email only when:
      //   - both fields are set on the record after the save AND
      //   - at least one of them changed value from before.
      // Clearing or no-op saves shouldn't email the patient.
      const slotChanged = (before?.scheduledAt ?? null) !== (appointment.scheduledAt ?? null);
      const urlChanged = (before?.meetingUrl ?? null) !== (appointment.meetingUrl ?? null);
      const shouldEmail =
        Boolean(appointment.scheduledAt && appointment.meetingUrl) &&
        (slotChanged || urlChanged);
      if (shouldEmail) {
        sendAppointmentScheduledEmail({
          to: appointment.email,
          fullName: appointment.fullName,
          consultationType: appointment.consultationType,
          scheduledAt: new Date(appointment.scheduledAt!),
          meetingUrl: appointment.meetingUrl!,
        }).catch((emailErr) => {
          app.log.warn({ err: emailErr }, "Failed to send schedule email — continuing");
        });
      }

      // Fire APPOINTMENT_ASSIGNED to the doctor when the doctorId
      // transitioned from null/different to a new value. Skip when the
      // admin saved an unrelated edit (no doctor change).
      if (
        doctorIdInput !== undefined &&
        doctorIdInput !== null &&
        doctorIdInput !== beforeDoctorId
      ) {
        notifyDoctor(doctorIdInput, "APPOINTMENT_ASSIGNED", {
          appointmentId: appointment.id,
          snippet: `${appointment.consultationType} · ${appointment.fullName}`,
        }).catch((err) =>
          app.log.warn({ err }, "notifyDoctor failed (appointment assigned)"),
        );
      }

      return okResponse({ appointment, emailed: shouldEmail }, "Appointment scheduled");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin schedule error"));
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
