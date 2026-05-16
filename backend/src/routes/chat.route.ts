import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { MessageAuthorRole } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";

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
  app.get("/api/account/appointments/:id/messages", async (request, reply) => {
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
  });

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

  // ── Admin surface ───────────────────────────────────────────────
  app.get("/api/admin/appointments/:id/messages", async (request, reply) => {
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
  });

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
          select: { id: true },
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
};

export default chatRoute;
