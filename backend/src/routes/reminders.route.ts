import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { sendAppointmentReminderEmail } from "../lib/email/templates.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { notifyDoctor } from "../modules/notifications/notify.service.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Cron-triggered 24h appointment-reminder runner.
 *
 * External scheduler (Railway cron, GitHub Actions, EasyCron, etc.) hits
 * `POST /api/internal/run-reminders` once an hour with the `CRON_SECRET`
 * in the `x-cron-secret` header. The handler finds appointments where:
 *
 *   - scheduledAt is between now+23h and now+25h
 *   - meetingUrl is set
 *   - reminderSentAt is null
 *   - status is not CANCELLED/COMPLETED
 *
 * For each match, it sends the reminder email and stamps
 * `reminderSentAt = now()` so repeat runs in the same window don't
 * double-send.
 */
const remindersRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/internal/run-reminders", async (request, reply) => {
    if (!env.CRON_SECRET) {
      return reply.status(503).send(errorResponse("Reminder runner is not configured"));
    }
    const provided = request.headers["x-cron-secret"];
    if (typeof provided !== "string" || provided !== env.CRON_SECRET) {
      return reply.status(401).send(errorResponse("Not authorised"));
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    try {
      const due = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: windowStart, lte: windowEnd },
          meetingUrl: { not: null },
          reminderSentAt: null,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          consultationType: true,
          scheduledAt: true,
          meetingUrl: true,
        },
        take: 100,
      });

      let sent = 0;
      let failed = 0;
      for (const a of due) {
        if (!a.scheduledAt || !a.meetingUrl) continue;
        try {
          await sendAppointmentReminderEmail({
            to: a.email,
            fullName: a.fullName,
            consultationType: a.consultationType,
            scheduledAt: a.scheduledAt,
            meetingUrl: a.meetingUrl,
          });
          await prisma.appointment.update({
            where: { id: a.id },
            data: { reminderSentAt: new Date() },
          });
          sent++;
        } catch (err) {
          failed++;
          app.log.warn({ err, appointmentId: a.id }, "Reminder email failed");
        }
      }

      // Doctor-side: fan out in-portal notifications for any
      // appointment scheduled in the same 24h window that has an
      // assigned doctor. Independent of the patient email path so
      // doctors get reminded even when meetingUrl is empty (IN_PERSON
      // appointments) or when the patient reminder is already sent.
      const doctorWindowDue = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: windowStart, lte: windowEnd },
          doctorId: { not: null },
          doctorReminderSentAt: null,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
        select: {
          id: true,
          fullName: true,
          doctorId: true,
          consultationType: true,
          scheduledAt: true,
          meetingUrl: true,
        },
        take: 200,
      });

      let doctorNotified = 0;
      for (const a of doctorWindowDue) {
        if (!a.doctorId || !a.scheduledAt) continue;
        try {
          await notifyDoctor(a.doctorId, "APPOINTMENT_REMINDER", {
            appointmentId: a.id,
            snippet: `${a.fullName} · ${new Date(a.scheduledAt).toLocaleString()}${
              a.meetingUrl ? "" : " (missing meeting link)"
            }`,
          });
          await prisma.appointment.update({
            where: { id: a.id },
            data: { doctorReminderSentAt: new Date() },
          });
          doctorNotified++;
        } catch (err) {
          app.log.warn(
            { err, appointmentId: a.id },
            "Doctor reminder notify failed",
          );
        }
      }

      return okResponse(
        {
          candidates: due.length,
          sent,
          failed,
          doctorCandidates: doctorWindowDue.length,
          doctorNotified,
        },
        `Reminder run complete: ${sent} patient email(s), ${doctorNotified} doctor notification(s).`,
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
