import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ChatAuthorRole } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  putObject,
  getObject,
  streamToNodeReadable,
  isMediaStorageConfigured,
} from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";

/**
 * Patient ↔ doctor consultation chat per appointment.
 *
 * Separate from the patient ↔ admin `Message` thread. Stores messages in
 * `ConsultationMessage`. File attachments go to S3 under a
 * `patient-chat/<appointmentId>/` prefix; auth-gated download prevents
 * unauthenticated access.
 *
 * Chat lifecycle:
 *   - Default: OPEN (patient and doctor can both send)
 *   - After `consultationCompletedAt` + 24 h: patient POST → 403 "Chat locked"
 *   - Doctor PATCH { open: true }  → sets `chatReopenedByDoctor = true`
 *   - Doctor PATCH { open: false } → sets `chatReopenedByDoctor = false`
 *
 * Patient surface:
 *   GET  /api/account/appointments/:id/chat
 *   POST /api/account/appointments/:id/chat
 *   POST /api/account/appointments/:id/chat/upload
 *   GET  /api/account/appointments/:id/chat/download/:messageId
 *
 * Doctor surface:
 *   GET   /api/doctor/appointments/:id/chat
 *   POST  /api/doctor/appointments/:id/chat
 *   POST  /api/doctor/appointments/:id/chat/upload
 *   PATCH /api/doctor/appointments/:id/chat   { open: boolean }
 *   GET   /api/doctor/appointments/:id/chat/download/:messageId
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
]);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const idParamSchema = z.object({ id: z.string().min(1).max(120) });
const messageIdParamSchema = z.object({
  id: z.string().min(1).max(120),
  messageId: z.string().min(1).max(120),
});
const postBodySchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(2000),
});
const patchBodySchema = z.object({
  open: z.boolean(),
});

type SerializedChatMessage = {
  id: string;
  authorRole: "PATIENT" | "DOCTOR";
  body: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  downloadUrl: string | null;
  readByPatient: boolean;
  readByDoctor: boolean;
  createdAt: string;
};

function serializeMessage(
  m: {
    id: string;
    authorRole: ChatAuthorRole;
    body: string | null;
    fileName: string | null;
    mimeType: string | null;
    byteSize: number | null;
    storageKey: string | null;
    readByPatient: boolean;
    readByDoctor: boolean;
    createdAt: Date;
  },
  surface: "patient" | "doctor",
  appointmentId: string,
): SerializedChatMessage {
  const downloadBase =
    surface === "patient"
      ? `/api/account/appointments/${appointmentId}/chat/download/${m.id}`
      : `/api/doctor/appointments/${appointmentId}/chat/download/${m.id}`;

  return {
    id: m.id,
    authorRole: m.authorRole,
    body: m.body,
    fileName: m.fileName,
    mimeType: m.mimeType,
    byteSize: m.byteSize,
    downloadUrl: m.storageKey ? downloadBase : null,
    readByPatient: m.readByPatient,
    readByDoctor: m.readByDoctor,
    createdAt: m.createdAt.toISOString(),
  };
}

async function listMessages(
  appointmentId: string,
  surface: "patient" | "doctor",
): Promise<SerializedChatMessage[]> {
  const rows = await prisma.consultationMessage.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      authorRole: true,
      body: true,
      fileName: true,
      mimeType: true,
      byteSize: true,
      storageKey: true,
      readByPatient: true,
      readByDoctor: true,
      createdAt: true,
    },
  });
  return rows.map((r) => serializeMessage(r, surface, appointmentId));
}

function isChatLocked(appt: {
  consultationCompletedAt: Date | null;
  chatReopenedByDoctor: boolean;
}): boolean {
  if (!appt.consultationCompletedAt) return false;
  if (appt.chatReopenedByDoctor) return false;
  return Date.now() - appt.consultationCompletedAt.getTime() > TWENTY_FOUR_HOURS_MS;
}

const consultationChatRoute: FastifyPluginAsync = async (app) => {
  // ── Patient: GET messages ────────────────────────────────────────
  app.get("/api/account/appointments/:id/chat", async (request, reply) => {
    let user;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      return reply.status(500).send(errorResponse("Authentication error"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid appointment id"));

    try {
      const appt = await prisma.appointment.findFirst({
        where: { id: params.data.id, userId: user.id },
        select: {
          id: true,
          consultationCompletedAt: true,
          chatReopenedByDoctor: true,
        },
      });
      if (!appt) return reply.status(404).send(errorResponse("Appointment not found"));

      const items = await listMessages(appt.id, "patient");

      await prisma.consultationMessage.updateMany({
        where: {
          appointmentId: appt.id,
          authorRole: ChatAuthorRole.DOCTOR,
          readByPatient: false,
        },
        data: { readByPatient: true },
      });

      return okResponse({ items, chatLocked: isChatLocked(appt) });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load messages"));
    }
  });

  // ── Patient: POST text message ────────────────────────────────────
  app.post(
    "/api/account/appointments/:id/chat",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      let user;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        return reply.status(500).send(errorResponse("Authentication error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid appointment id"));

      const body = postBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid message", body.error.flatten()));
      }

      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: params.data.id, userId: user.id },
          select: {
            id: true,
            consultationCompletedAt: true,
            chatReopenedByDoctor: true,
          },
        });
        if (!appt) return reply.status(404).send(errorResponse("Appointment not found"));

        if (isChatLocked(appt)) {
          return reply.status(403).send(errorResponse("Chat window closed. Contact your doctor to re-open."));
        }

        await prisma.consultationMessage.create({
          data: {
            appointmentId: appt.id,
            authorRole: ChatAuthorRole.PATIENT,
            authorUserId: user.id,
            body: body.data.body,
            readByPatient: true,
            readByDoctor: false,
          },
        });

        const items = await listMessages(appt.id, "patient");
        return okResponse({ items, chatLocked: false });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not send message"));
      }
    },
  );

  // ── Patient: POST file upload ─────────────────────────────────────
  app.post(
    "/api/account/appointments/:id/chat/upload",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      let user;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        return reply.status(500).send(errorResponse("Authentication error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("File storage is not configured"));
      }

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid appointment id"));

      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: params.data.id, userId: user.id },
          select: {
            id: true,
            consultationCompletedAt: true,
            chatReopenedByDoctor: true,
          },
        });
        if (!appt) return reply.status(404).send(errorResponse("Appointment not found"));

        if (isChatLocked(appt)) {
          return reply.status(403).send(errorResponse("Chat window closed. Contact your doctor to re-open."));
        }

        const file = await request.file();
        if (!file) return reply.status(400).send(errorResponse('Expected a file field named "file"'));

        const mimetype = file.mimetype ?? "";
        if (!ALLOWED_MIME.has(mimetype)) {
          return reply.status(415).send(errorResponse("Unsupported file type — use PDF / JPEG / PNG / WebP"));
        }

        const buffer = await file.toBuffer();
        if (buffer.length > MAX_BYTES) {
          return reply.status(413).send(errorResponse("File too large (max 20 MB)"));
        }

        const safeName = sanitizeOriginalFilename(file.filename ?? "file");
        const storageKey = `patient-chat/${appt.id}/${randomUUID()}-${safeName}`;

        await putObject(storageKey, buffer, mimetype);

        const row = await prisma.consultationMessage.create({
          data: {
            appointmentId: appt.id,
            authorRole: ChatAuthorRole.PATIENT,
            authorUserId: user.id,
            storageKey,
            fileName: safeName,
            mimeType: mimetype,
            byteSize: buffer.length,
            readByPatient: true,
            readByDoctor: false,
          },
        });

        const items = await listMessages(appt.id, "patient");
        return okResponse({ items, chatLocked: false, uploadedId: row.id });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Upload failed"));
      }
    },
  );

  // ── Patient: GET download attachment ─────────────────────────────
  app.get("/api/account/appointments/:id/chat/download/:messageId", async (request, reply) => {
    let user;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

    const params = messageIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid params"));

    try {
      const msg = await prisma.consultationMessage.findFirst({
        where: {
          id: params.data.messageId,
          appointment: { userId: user.id },
        },
        select: { storageKey: true, fileName: true, mimeType: true },
      });
      if (!msg?.storageKey) return reply.status(404).send(errorResponse("File not found"));

      const obj = await getObject(msg.storageKey);
      reply.header("content-type", msg.mimeType ?? "application/octet-stream");
      reply.header("content-disposition", `inline; filename="${msg.fileName ?? "file"}"`);
      return reply.send(streamToNodeReadable(obj.Body));
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not retrieve file"));
    }
  });

  // ── Doctor: GET messages ──────────────────────────────────────────
  app.get("/api/doctor/appointments/:id/chat", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid appointment id"));

    try {
      const appt = await prisma.appointment.findFirst({
        where: { id: params.data.id, doctorId: auth.doctorId },
        select: {
          id: true,
          consultationCompletedAt: true,
          chatReopenedByDoctor: true,
        },
      });
      if (!appt) return reply.status(404).send(errorResponse("Appointment not found"));

      const items = await listMessages(appt.id, "doctor");

      await prisma.consultationMessage.updateMany({
        where: {
          appointmentId: appt.id,
          authorRole: ChatAuthorRole.PATIENT,
          readByDoctor: false,
        },
        data: { readByDoctor: true },
      });

      return okResponse({ items, chatLocked: isChatLocked(appt) });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load messages"));
    }
  });

  // ── Doctor: POST text message ─────────────────────────────────────
  app.post(
    "/api/doctor/appointments/:id/chat",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid appointment id"));

      const body = postBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid message", body.error.flatten()));
      }

      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: params.data.id, doctorId: auth.doctorId },
          select: {
            id: true,
            consultationCompletedAt: true,
            chatReopenedByDoctor: true,
          },
        });
        if (!appt) return reply.status(404).send(errorResponse("Appointment not found"));

        await prisma.consultationMessage.create({
          data: {
            appointmentId: appt.id,
            authorRole: ChatAuthorRole.DOCTOR,
            authorUserId: auth.userId,
            body: body.data.body,
            readByPatient: false,
            readByDoctor: true,
          },
        });

        const items = await listMessages(appt.id, "doctor");
        return okResponse({ items, chatLocked: isChatLocked(appt) });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not send message"));
      }
    },
  );

  // ── Doctor: POST file upload ──────────────────────────────────────
  app.post(
    "/api/doctor/appointments/:id/chat/upload",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("File storage is not configured"));
      }

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid appointment id"));

      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: params.data.id, doctorId: auth.doctorId },
          select: { id: true },
        });
        if (!appt) return reply.status(404).send(errorResponse("Appointment not found"));

        const file = await request.file();
        if (!file) return reply.status(400).send(errorResponse('Expected a file field named "file"'));

        const mimetype = file.mimetype ?? "";
        if (!ALLOWED_MIME.has(mimetype)) {
          return reply.status(415).send(errorResponse("Unsupported file type"));
        }

        const buffer = await file.toBuffer();
        if (buffer.length > MAX_BYTES) {
          return reply.status(413).send(errorResponse("File too large (max 20 MB)"));
        }

        const safeName = sanitizeOriginalFilename(file.filename ?? "file");
        const storageKey = `patient-chat/${appt.id}/${randomUUID()}-${safeName}`;

        await putObject(storageKey, buffer, mimetype);

        const row = await prisma.consultationMessage.create({
          data: {
            appointmentId: appt.id,
            authorRole: ChatAuthorRole.DOCTOR,
            authorUserId: auth.userId,
            storageKey,
            fileName: safeName,
            mimeType: mimetype,
            byteSize: buffer.length,
            readByPatient: false,
            readByDoctor: true,
          },
        });

        const items = await listMessages(appt.id, "doctor");
        return okResponse({ items, uploadedId: row.id });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Upload failed"));
      }
    },
  );

  // ── Doctor: PATCH — toggle chat lock ─────────────────────────────
  app.patch(
    "/api/doctor/appointments/:id/chat",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid appointment id"));

      const body = patchBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse('Body must be { "open": boolean }'));
      }

      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: params.data.id, doctorId: auth.doctorId },
          select: { id: true },
        });
        if (!appt) return reply.status(404).send(errorResponse("Appointment not found"));

        await prisma.appointment.update({
          where: { id: appt.id },
          data: { chatReopenedByDoctor: body.data.open },
        });

        return okResponse({ chatLocked: !body.data.open });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not update chat status"));
      }
    },
  );

  // ── Doctor: GET download attachment ──────────────────────────────
  app.get("/api/doctor/appointments/:id/chat/download/:messageId", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const params = messageIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid params"));

    try {
      const msg = await prisma.consultationMessage.findFirst({
        where: {
          id: params.data.messageId,
          appointment: { doctorId: auth.doctorId },
        },
        select: { storageKey: true, fileName: true, mimeType: true },
      });
      if (!msg?.storageKey) return reply.status(404).send(errorResponse("File not found"));

      const obj = await getObject(msg.storageKey);
      reply.header("content-type", msg.mimeType ?? "application/octet-stream");
      reply.header("content-disposition", `inline; filename="${msg.fileName ?? "file"}"`);
      return reply.send(streamToNodeReadable(obj.Body));
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not retrieve file"));
    }
  });
};

export default consultationChatRoute;
