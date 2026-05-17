import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  notifyAdmins,
  notifyDoctor,
} from "../modules/notifications/notify.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";

/**
 * Internal (doctor ↔ admin) per-appointment notes. Patient never sees
 * these — patient chat is the separate `Message` model (polled via the
 * `/api/account/.../messages` endpoint).
 *
 * Doctor-side:
 *   GET    /api/doctor/appointments/:id/internal-messages
 *   POST   /api/doctor/appointments/:id/internal-messages
 *
 * Admin-side:
 *   GET    /api/admin/appointments/:id/internal-messages
 *   POST   /api/admin/appointments/:id/internal-messages
 *
 * The thread shape (`appointmentId + createdAt`) is the same for both —
 * the only difference is the author role stamped on insert.
 */

const postBodySchema = z
  .object({
    body: z.string().trim().min(1).max(8000),
  })
  .strict();

function serializeMessage(row: {
  id: string;
  authorRole: "DOCTOR" | "ADMIN";
  body: string;
  createdAt: Date;
  author: { fullName: string } | null;
}) {
  return {
    id: row.id,
    authorRole: row.authorRole,
    authorName: row.author?.fullName ?? "Staff",
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

const internalMessagesRoute: FastifyPluginAsync = async (app) => {
  // Doctor — list
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/internal-messages",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: request.params.id, doctorId: auth.doctorId },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const rows = await prisma.internalMessage.findMany({
          where: { appointmentId: appt.id },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { fullName: true } } },
        });
        return okResponse({ items: rows.map(serializeMessage) });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load messages"));
      }
    },
  );

  // Doctor — post
  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/internal-messages",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = postBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid message", body.error.flatten()));
      }
      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: request.params.id, doctorId: auth.doctorId },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const row = await prisma.internalMessage.create({
          data: {
            appointmentId: appt.id,
            authorUserId: auth.userId,
            authorRole: "DOCTOR",
            body: body.data.body,
          },
          include: { author: { select: { fullName: true } } },
        });
        // Fan out to admin team-inbox. Best-effort — never block the
        // POST on notification failure.
        notifyAdmins("INTERNAL_MESSAGE", {
          appointmentId: appt.id,
          snippet: body.data.body.slice(0, 120),
          byUserName: row.author?.fullName,
          byRole: "DOCTOR",
        }).catch((err) =>
          app.log.warn({ err }, "notifyAdmins failed (doctor→admin message)"),
        );
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "INTERNAL_MESSAGE_POSTED",
          entityType: "InternalMessage",
          entityId: row.id,
          metadata: { appointmentId: appt.id },
          request,
        }).catch(() => {});
        return reply.status(201).send(okResponse({ message: serializeMessage(row) }));
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not post message"));
      }
    },
  );

  // Admin — list
  app.get<{ Params: { id: string } }>(
    "/api/admin/appointments/:id/internal-messages",
    async (request, reply) => {
      const admin = await verifyAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
      try {
        const appt = await prisma.appointment.findUnique({
          where: { id: request.params.id },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const rows = await prisma.internalMessage.findMany({
          where: { appointmentId: appt.id },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { fullName: true } } },
        });
        return okResponse({ items: rows.map(serializeMessage) });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load messages"));
      }
    },
  );

  // Admin — post
  app.post<{ Params: { id: string } }>(
    "/api/admin/appointments/:id/internal-messages",
    async (request, reply) => {
      const admin = await verifyAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
      // Admin auth doesn't expose the userId in the session helper —
      // pull it via the same cookie path used elsewhere.
      const user = await resolveOptionalAuthUser(request);
      if (!user) {
        return reply.status(401).send(errorResponse("Not authenticated"));
      }
      const body = postBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid message", body.error.flatten()));
      }
      try {
        const appt = await prisma.appointment.findUnique({
          where: { id: request.params.id },
          select: { id: true, doctorId: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const row = await prisma.internalMessage.create({
          data: {
            appointmentId: appt.id,
            authorUserId: user.id,
            authorRole: "ADMIN",
            body: body.data.body,
          },
          include: { author: { select: { fullName: true } } },
        });
        // Notify the assigned doctor (if any). Skip when the
        // appointment has no doctor linked yet.
        if (appt.doctorId) {
          notifyDoctor(appt.doctorId, "INTERNAL_MESSAGE", {
            appointmentId: appt.id,
            snippet: body.data.body.slice(0, 120),
            byUserName: row.author?.fullName,
            byRole: "ADMIN",
          }).catch((err) =>
            app.log.warn({ err }, "notifyDoctor failed (admin→doctor message)"),
          );
        }
        recordAudit({
          actorUserId: user.id,
          actorRole: "ADMIN",
          action: "INTERNAL_MESSAGE_POSTED",
          entityType: "InternalMessage",
          entityId: row.id,
          metadata: { appointmentId: appt.id },
          request,
        }).catch(() => {});
        return reply.status(201).send(okResponse({ message: serializeMessage(row) }));
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not post message"));
      }
    },
  );
};

export default internalMessagesRoute;
