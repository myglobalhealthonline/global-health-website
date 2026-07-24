import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { sendAppointmentReminderEmail } from "../lib/email/templates.js";
import { formatDoctorForPatientNotification } from "../lib/doctor-name.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { formatNotificationDateTime } from "../modules/notifications/notification-datetime.js";
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
    if (!isValidCronSecret(provided, env.CRON_SECRET)) {
      return reply.status(401).send(errorResponse("Not authorised"));
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    try {
      // Reminder is due when scheduledAt is in the 23-25h window AND we
      // can tell the patient how to attend — either a meetingUrl (ONLINE)
      // OR a clinic / locationAddress (IN_PERSON). Skipping IN_PERSON
      // because meetingUrl is null was a long-standing gap; the OR-of-
      // signals below closes it.
      const due = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: windowStart, lte: windowEnd },
          reminderSentAt: null,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
          OR: [
            { meetingUrl: { not: null } },
            { clinicId: { not: null } },
            { locationAddress: { not: null } },
          ],
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          consultationType: true,
          scheduledAt: true,
          meetingUrl: true,
          consultationMode: true,
          locationAddress: true,
          clinic: { select: { name: true, city: true } },
          doctor: { select: { fullName: true } },
        },
        take: 100,
      });

      // Send all reminders in parallel (a single hung email no longer stalls
      // the whole run), then stamp reminderSentAt for the successes in one
      // updateMany instead of an update per row.
      const sendResults = await Promise.allSettled(
        due.map(async (a) => {
          if (!a.scheduledAt) return null;
          const isInPerson = a.consultationMode === "IN_PERSON";
          const where = a.clinic
            ? [a.clinic.name, a.clinic.city].filter(Boolean).join(", ")
            : a.locationAddress ?? null;
          if (isInPerson && !where) return null;
          if (!isInPerson && !a.meetingUrl) return null;
          await sendAppointmentReminderEmail({
            to: a.email,
            fullName: a.fullName,
            consultationType: a.consultationType,
            scheduledAt: a.scheduledAt,
            meetingUrl: isInPerson ? null : a.meetingUrl,
            where: isInPerson ? where : null,
            doctorName: a.doctor
              ? formatDoctorForPatientNotification(a.doctor.fullName)
              : null,
          });
          return a.id;
        }),
      );
      const sentIds: string[] = [];
      let failed = 0;
      for (const r of sendResults) {
        if (r.status === "fulfilled") {
          if (r.value) sentIds.push(r.value);
        } else {
          failed++;
          app.log.warn({ err: r.reason }, "Reminder email failed");
        }
      }
      if (sentIds.length > 0) {
        await prisma.appointment.updateMany({
          where: { id: { in: sentIds } },
          data: { reminderSentAt: new Date() },
        });
      }
      const sent = sentIds.length;

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
          countryCode: true,
          // Clinic zone for the snippet's wall clock. Pulled through the
          // relations rather than via resolveStaffTimeZone() per row, which
          // would add queries per appointment to a loop of up to 200. The
          // booked SERVICE's market wins over the doctor's own country — a
          // doctor rostered in several markets reads each booking on the
          // clock of the country it was booked in.
          service: {
            select: {
              country: {
                select: { bookingSetting: { select: { timezone: true } } },
              },
            },
          },
          doctor: {
            select: {
              country: {
                select: { bookingSetting: { select: { timezone: true } } },
              },
            },
          },
        },
        take: 200,
      });

      // One lookup for the whole batch — covers free-text bookings that carry a
      // countryCode but no Service row. Country codes are stored lowercase.
      const countryZones = new Map<string, string>();
      if (doctorWindowDue.length > 0) {
        const countries = await prisma.country.findMany({
          select: { code: true, bookingSetting: { select: { timezone: true } } },
        });
        for (const c of countries) {
          const tz = c.bookingSetting?.timezone;
          if (tz) countryZones.set(c.code.toLowerCase(), tz);
        }
      }

      let doctorNotified = 0;
      for (const a of doctorWindowDue) {
        if (!a.doctorId || !a.scheduledAt) continue;
        try {
          const staffTz =
            a.service?.country?.bookingSetting?.timezone ??
            countryZones.get(a.countryCode?.toLowerCase() ?? "") ??
            a.doctor?.country?.bookingSetting?.timezone;
          await notifyDoctor(a.doctorId, "APPOINTMENT_REMINDER", {
            appointmentId: a.id,
            snippet: `${a.fullName} · ${formatNotificationDateTime(
              a.scheduledAt,
              staffTz,
            )}${a.meetingUrl ? "" : " (missing meeting link)"}`,
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
