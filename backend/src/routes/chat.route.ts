import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { MessageAuthorRole, ChatAuthorRole } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";
import { notifyAdmins, notifyUser } from "../modules/notifications/notify.service.js";
import { alertAdminsOfPatientMessage } from "../modules/notifications/patient-message-alert.service.js";
import { mapAppointmentOrderNumbers } from "../modules/orders/appointment-order-number.js";

/**
 * Patient ↔ admin chat thread per appointment.
 *
 * Polling-based (no WebSocket). Both sides hit GET every ~10s and the
 * server returns the full thread (capped at 200 messages — chats stay
 * short pre-consult). POSTs are rate-limited modestly so a stuck client
 * doesn't hammer the DB.
 *
 * Patient surface: /api/account/appointments/:id/messages (GET, POST)
 * Admin surface:   /api/admin/appointments/:id/messages   (GET, POST)
 *
 * The two routes share validation + serialisation; only the authorship
 * check + author-role stamp differ.
 */

const idParamSchema = z.object({ id: z.string().min(1).max(120) });
const postMessageBodySchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(2000),
});

type SerializedMessage = {
  id: string;
  authorRole: "PATIENT" | "ADMIN";
  body: string;
  createdAt: string;
  readByPatient: boolean;
  readByAdmin: boolean;
};

async function listMessages(appointmentId: string): Promise<SerializedMessage[]> {
  const rows = await prisma.message.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      authorRole: true,
      body: true,
      readByPatient: true,
      readByAdmin: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    authorRole: r.authorRole,
    body: r.body,
    readByPatient: r.readByPatient,
    readByAdmin: r.readByAdmin,
    createdAt: r.createdAt.toISOString(),
  }));
}

const chatRoute: FastifyPluginAsync = async (app) => {
  // ── Patient surface ─────────────────────────────────────────────
  app.get(
    "/api/account/appointments/:id/messages",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
    let user: SafeUser | null = null;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid appointment id"));
    }

    try {
      const owned = await prisma.appointment.findFirst({
        where: { id: params.data.id, userId: user.id },
        select: { id: true },
      });
      if (!owned) return reply.status(404).send(errorResponse("Appointment not found"));

      const items = await listMessages(params.data.id);

      // Mark admin-authored messages as read by the patient when they
      // open the thread. Patient-authored rows are untouched.
      await prisma.message.updateMany({
        where: {
          appointmentId: params.data.id,
          authorRole: MessageAuthorRole.ADMIN,
          readByPatient: false,
        },
        data: { readByPatient: true },
      });

      return okResponse({ items });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load messages"));
    }
    },
  );

  app.post(
    "/api/account/appointments/:id/messages",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      let user: SafeUser | null = null;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Unexpected authentication error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid appointment id"));
      }
      const body = postMessageBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid message", body.error.flatten()));
      }

      try {
        const owned = await prisma.appointment.findFirst({
          where: { id: params.data.id, userId: user.id },
          select: { id: true },
        });
        if (!owned) return reply.status(404).send(errorResponse("Appointment not found"));

        await prisma.message.create({
          data: {
            appointmentId: params.data.id,
            authorRole: MessageAuthorRole.PATIENT,
            authorUserId: user.id,
            body: body.data.body,
            // Patient's own message is "read by patient" by default; admin
            // will mark `readByAdmin` true on next admin GET.
            readByPatient: true,
            readByAdmin: false,
          },
        });

        // Surface the message on the admin bell. Best-effort — never fail the
        // send if the notification write errors.
        notifyAdmins("PATIENT_MESSAGE", {
          appointmentId: params.data.id,
          snippet: body.data.body.slice(0, 140),
          byUserName: user.fullName,
          byRole: "PATIENT",
          channel: "clinic",
        }).catch((e) => app.log.error(e));

        // Email + WhatsApp alert to the admin team — throttled per
        // appointment so a burst of patient messages only alerts once.
        void alertAdminsOfPatientMessage({
          appointmentId: params.data.id,
          patientName: user.fullName,
          snippet: body.data.body.slice(0, 140),
          log: app.log,
        });

        const items = await listMessages(params.data.id);
        return okResponse({ items });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not send message"));
      }
    },
  );

  // ── Patient: unread count ────────────────────────────────────────
  app.get(
    "/api/account/messages/unread",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
    let user: SafeUser | null = null;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse((err as Error).message));
      }
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
    try {
      const count = await prisma.message.count({
        where: {
          appointment: { userId: user.id },
          authorRole: MessageAuthorRole.ADMIN,
          readByPatient: false,
        },
      });
      return okResponse({ unreadCount: count });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse((err as Error).message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not fetch unread count"));
    }
    },
  );

  // ── Patient: per-appointment unread counts ───────────────────────
  // Powers the patient "Messages" tab so each booking can show which of its
  // two threads (clinic / doctor) has new messages. Returns one entry per
  // appointment that currently has any unread message for this patient.
  app.get(
    "/api/account/message-threads",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      let user: SafeUser | null = null;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Unexpected authentication error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

      try {
        const [clinic, doctor] = await Promise.all([
          prisma.message.groupBy({
            by: ["appointmentId"],
            where: {
              appointment: { userId: user.id },
              authorRole: MessageAuthorRole.ADMIN,
              readByPatient: false,
            },
            _count: { _all: true },
          }),
          prisma.consultationMessage.groupBy({
            by: ["appointmentId"],
            where: {
              appointment: { userId: user.id },
              authorRole: ChatAuthorRole.DOCTOR,
              readByPatient: false,
            },
            _count: { _all: true },
          }),
        ]);

        const map = new Map<
          string,
          { appointmentId: string; unreadClinic: number; unreadDoctor: number }
        >();
        for (const c of clinic) {
          map.set(c.appointmentId, {
            appointmentId: c.appointmentId,
            unreadClinic: c._count._all,
            unreadDoctor: 0,
          });
        }
        for (const d of doctor) {
          const entry = map.get(d.appointmentId) ?? {
            appointmentId: d.appointmentId,
            unreadClinic: 0,
            unreadDoctor: 0,
          };
          entry.unreadDoctor = d._count._all;
          map.set(d.appointmentId, entry);
        }

        return okResponse({ items: Array.from(map.values()) });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load unread counts"));
      }
    },
  );

  // ── Admin surface ───────────────────────────────────────────────
  app.get(
    "/api/admin/appointments/:id/messages",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
    let user: SafeUser | null = null;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
    if (user.role !== "ADMIN") return reply.status(403).send(errorResponse("Forbidden"));

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid appointment id"));
    }

    try {
      const exists = await prisma.appointment.findUnique({
        where: { id: params.data.id },
        select: { id: true },
      });
      if (!exists) return reply.status(404).send(errorResponse("Appointment not found"));

      const items = await listMessages(params.data.id);

      await prisma.message.updateMany({
        where: {
          appointmentId: params.data.id,
          authorRole: MessageAuthorRole.PATIENT,
          readByAdmin: false,
        },
        data: { readByAdmin: true },
      });

      return okResponse({ items });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load messages"));
    }
    },
  );

  app.post(
    "/api/admin/appointments/:id/messages",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      let user: SafeUser | null = null;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Unexpected authentication error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
      if (user.role !== "ADMIN") return reply.status(403).send(errorResponse("Forbidden"));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid appointment id"));
      }
      const body = postMessageBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid message", body.error.flatten()));
      }

      try {
        const exists = await prisma.appointment.findUnique({
          where: { id: params.data.id },
          select: { id: true, userId: true },
        });
        if (!exists) return reply.status(404).send(errorResponse("Appointment not found"));

        await prisma.message.create({
          data: {
            appointmentId: params.data.id,
            authorRole: MessageAuthorRole.ADMIN,
            authorUserId: user.id,
            body: body.data.body,
            readByPatient: false,
            readByAdmin: true,
          },
        });

        // Notify the patient's bell that the clinic replied.
        if (exists.userId) {
          notifyUser(exists.userId, "MESSAGE_REPLY", {
            appointmentId: params.data.id,
            title: "New message from the clinic",
            body: body.data.body.slice(0, 140),
            href: `/account/messages?open=${params.data.id}&channel=clinic`,
            channel: "clinic",
          }).catch((e) => app.log.error(e));
        }

        const items = await listMessages(params.data.id);
        return okResponse({ items });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not send message"));
      }
    },
  );

  // ── Admin: inbox — all patient↔admin threads ─────────────────────
  // Powers the admin "Messages" tab: one row per appointment that has at
  // least one message, newest activity first, with a per-thread unread
  // (patient→admin) count.
  app.get(
    "/api/admin/message-threads",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      let user: SafeUser | null = null;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Unexpected authentication error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
      if (user.role !== "ADMIN") return reply.status(403).send(errorResponse("Forbidden"));

      try {
        const appts = await prisma.appointment.findMany({
          where: { messages: { some: {} } },
          orderBy: { updatedAt: "desc" },
          take: 100,
          select: {
            id: true,
            consultationType: true,
            countryCode: true,
            createdAt: true,
            user: { select: { fullName: true, email: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { body: true, authorRole: true, createdAt: true },
            },
          },
        });

        const ids = appts.map((a) => a.id);
        const [unread, orderNumbers] = await Promise.all([
          ids.length
            ? prisma.message.groupBy({
                by: ["appointmentId"],
                where: {
                  appointmentId: { in: ids },
                  authorRole: MessageAuthorRole.PATIENT,
                  readByAdmin: false,
                },
                _count: { _all: true },
              })
            : Promise.resolve([]),
          mapAppointmentOrderNumbers(ids),
        ]);
        const unreadMap = new Map(unread.map((u) => [u.appointmentId, u._count._all]));

        const items = appts.map((a) => {
          const last = a.messages[0];
          return {
            appointmentId: a.id,
            orderNumber: orderNumbers.get(a.id) ?? null,
            patientName: a.user?.fullName ?? "Unknown patient",
            patientEmail: a.user?.email ?? null,
            consultationType: a.consultationType,
            countryCode: a.countryCode,
            lastMessage: last
              ? {
                  body: last.body,
                  authorRole: last.authorRole,
                  createdAt: last.createdAt.toISOString(),
                }
              : null,
            unreadCount: unreadMap.get(a.id) ?? 0,
          };
        });

        return okResponse({ items });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load message threads"));
      }
    },
  );
};

export default chatRoute;
