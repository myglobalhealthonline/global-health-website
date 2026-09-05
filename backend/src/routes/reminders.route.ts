import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { enqueueDueAppointmentReminders } from "../modules/appointments/appointment-reminder.service.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Cron-triggered 24h appointment-reminder ENQUEUE pass.
 *
 * An external scheduler (Railway cron, GitHub Actions, EasyCron, …) hits
 * `POST /api/internal/run-reminders` with the `CRON_SECRET` in the
 * `x-cron-secret` header. It calls exactly the same
 * `enqueueDueAppointmentReminders()` the internal hourly tick does, so the two
 * triggers can overlap freely: the outbox rows carry unique idempotency keys.
 *
 * This handler no longer sends anything itself. It writes one durable outbox
 * row per pending patient/doctor reminder; the outbox dispatcher (30s tick)
 * does the send and stamps the delivery marker. See
 * `modules/appointments/appointment-reminder.service.ts`.
 */
const remindersRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/internal/run-reminders", async (request, reply) => {
    if (!env.CRON_SECRET) {
      return reply.status(503).send(errorResponse("Reminder runner is not configured"));
    }
    const provided = request.headers["x-cron-secret"];
    if (!isValidCronSecret(provided, env.CRON_SECRET)) {
      return reply.status(401).send(errorResponse("Not authorised"));
    }

    try {
      const result = await enqueueDueAppointmentReminders();
      return okResponse(
        result,
        `Reminder enqueue complete: ${result.patientQueued} patient + ${result.doctorQueued} doctor reminder(s) queued from ${result.scanned} appointment(s).`,
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not run reminders"));
    }
  });
};

export default remindersRoute;
