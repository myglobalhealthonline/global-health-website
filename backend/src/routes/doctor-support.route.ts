import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { SupportMessageAuthorRole } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { verifyGlobalAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  putObject,
  getObject,
  streamToNodeReadable,
  isMediaStorageConfigured,
} from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";
import { notifyDoctor } from "../modules/notifications/notify.service.js";
import {
  alertAdminsOfSupportMessage,
  alertDoctorOfSupportMessage,
  notifySupportAdmins,
  supportSnippet,
} from "../modules/support/support-notify.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";

/**
 * Doctor ↔ support (admin team) chat.
 *
 * One standing `SupportThread` per doctor, created lazily on first visit.
 * Distinct from `InternalMessage` (per-appointment doctor↔admin notes) and from
 * `ConsultationMessage` (patient↔doctor): a doctor's support question usually
 * has no appointment to hang off.
 *
 * Every admin shares the same thread. Replies carry the replying admin's first
 * name so the doctor knows who answered, and the serialized `authorUserId` lets
 * the admin surface render its own bubbles as "Me".
 *
 * Read state is asymmetric on purpose. The doctor is one reader, so
 * `SupportMessage.readByDoctor` is enough. The admin side has N readers, so
 * each admin gets a `SupportThreadRead.lastReadAt` cursor — `InternalMessage`
 * lacks this and has to derive "unread" from Notification rows instead.
 *
 * Doctor surface:
 *   GET  /api/doctor/support/thread
 *   GET  /api/doctor/support/unread
 *   POST /api/doctor/support/messages
 *   POST /api/doctor/support/messages/upload
 *   GET  /api/doctor/support/messages/:messageId/download
 *
 * Admin surface (global admins only — LOCAL_ADMIN is country-scoped and must
 * not read every doctor's thread):
 *   GET  /api/admin/support/doctors
 *   GET  /api/admin/support/threads
 *   POST /api/admin/support/threads          (admin opens a conversation)
 *   GET  /api/admin/support/threads/:threadId
 *   POST /api/admin/support/threads/:threadId/messages
 *   POST /api/admin/support/threads/:threadId/messages/upload
 *   GET  /api/admin/support/threads/:threadId/messages/:messageId/download
 *   POST /api/admin/support/threads/:threadId/notifications/read
 */

// Exactly the set `verifySniffedMime` can magic-byte verify. ZIP-container
// formats (docx/xlsx) are deliberately absent: they share one signature, so
// allowing them would mean trusting the declared type.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "application/pdf",
]);
// Must not exceed the global @fastify/multipart `fileSize` ceiling in app.ts
// (10 MB). Above that, `toBuffer()` throws on the truncated stream before this
// check runs and the request 500s instead of returning the 413 below.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const LIST_CAP = 300;
const THREAD_LIST_CAP = 100;

/** Exported for the route's unit tests — the body contract is the only input
 *  a caller controls freely, so it is worth pinning down. */
export const postBodySchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
});
const threadIdParamSchema = z.object({ threadId: z.string().min(1).max(120) });
/** Admin-initiated conversation: pick a doctor, write the opening message.
 *  Exported for the route's unit tests, same reasoning as `postBodySchema`. */
export const startThreadBodySchema = z.object({
  doctorId: z.string().min(1).max(120),
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
});
const messageIdParamSchema = z.object({ messageId: z.string().min(1).max(120) });
const adminMessageParamSchema = z.object({
  threadId: z.string().min(1).max(120),
  messageId: z.string().min(1).max(120),
});

/** Label shown on a bubble when the author account is gone. */
const FALLBACK_AUTHOR_NAME = "Support";

/**
 * First whitespace-delimited token of a full name — the admin team is
 * identified to doctors by first name only ("Ehtesham replied"), and by "Me"
 * to the admin who wrote it.
 */
export function firstName(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return FALLBACK_AUTHOR_NAME;
  return trimmed.split(/\s+/)[0] ?? FALLBACK_AUTHOR_NAME;
}

export type SerializedSupportMessage = {
  id: string;
  authorRole: "DOCTOR" | "ADMIN";
  /** Null when the author account was deleted. Drives the "Me" label. */
  authorUserId: string | null;
  authorFirstName: string;
  authorFullName: string | null;
  body: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  downloadUrl: string | null;
  readByDoctor: boolean;
  createdAt: string;
};

type SupportMessageRow = {
  id: string;
  authorRole: SupportMessageAuthorRole;
  authorUserId: string | null;
  body: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  storageKey: string | null;
  readByDoctor: boolean;
  createdAt: Date;
  author: { fullName: string | null } | null;
};

const MESSAGE_SELECT = {
  id: true,
  authorRole: true,
  authorUserId: true,
  body: true,
  fileName: true,
  mimeType: true,
  byteSize: true,
  storageKey: true,
  readByDoctor: true,
  createdAt: true,
  author: { select: { fullName: true } },
} as const;

export function serializeMessage(
  m: SupportMessageRow,
  surface: "doctor" | "admin",
  threadId: string,
): SerializedSupportMessage {
  const downloadBase =
    surface === "doctor"
      ? `/api/doctor/support/messages/${m.id}/download`
      : `/api/admin/support/threads/${threadId}/messages/${m.id}/download`;

  return {
    id: m.id,
    authorRole: m.authorRole,
    authorUserId: m.authorUserId,
    authorFirstName: firstName(m.author?.fullName),
    authorFullName: m.author?.fullName ?? null,
    body: m.body,
    fileName: m.fileName,
    mimeType: m.mimeType,
    byteSize: m.byteSize,
    downloadUrl: m.storageKey ? downloadBase : null,
    readByDoctor: m.readByDoctor,
    createdAt: m.createdAt.toISOString(),
  };
}

async function listMessages(
  threadId: string,
  surface: "doctor" | "admin",
): Promise<SerializedSupportMessage[]> {
  // Newest-first with a cap, then reversed: on a long thread we want the most
  // recent LIST_CAP messages, not the oldest.
  const rows = await prisma.supportMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: LIST_CAP,
    select: MESSAGE_SELECT,
  });
  return rows.reverse().map((r) => serializeMessage(r, surface, threadId));
}

/** The doctor's thread, created on first access. */
async function getOrCreateThread(doctorId: string): Promise<{ id: string }> {
  return prisma.supportThread.upsert({
    where: { doctorId },
    create: { doctorId },
    update: {},
    select: { id: true },
  });
}

const doctorSupportRoute: FastifyPluginAsync = async (app) => {
  // ── Doctor: GET thread (and mark admin messages read) ─────────────
  app.get("/api/doctor/support/thread", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    try {
      // verifyDoctorAccess already 403s an account with no linked Doctor
      // profile, so doctorId is always present here.
      const thread = await getOrCreateThread(auth.doctorId);
      const items = await listMessages(thread.id, "doctor");

      await prisma.supportMessage.updateMany({
        where: {
          threadId: thread.id,
          authorRole: SupportMessageAuthorRole.ADMIN,
          readByDoctor: false,
        },
        data: { readByDoctor: true },
      });

      // Clear this doctor's support bells in the same call — the badge and the
      // bell would otherwise disagree the moment the page is opened.
      await prisma.notification.updateMany({
        where: { recipientUserId: auth.userId, type: "SUPPORT_REPLY", readAt: null },
        data: { readAt: new Date() },
      });

      return okResponse({ threadId: thread.id, items });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load support messages"));
    }
  });

  // ── Doctor: unread count (sidebar badge) ─────────────────────────
  app.get(
    "/api/doctor/support/unread",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      try {
        const count = await prisma.supportMessage.count({
          where: {
            thread: { doctorId: auth.doctorId },
            authorRole: SupportMessageAuthorRole.ADMIN,
            readByDoctor: false,
          },
        });
        return okResponse({ unreadCount: count });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not fetch unread count"));
      }
    },
  );

  // ── Doctor: POST text message ────────────────────────────────────
  app.post(
    "/api/doctor/support/messages",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = postBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid message", body.error.flatten()));
      }

      try {
        const thread = await getOrCreateThread(auth.doctorId);
        const row = await prisma.supportMessage.create({
          data: {
            threadId: thread.id,
            authorRole: SupportMessageAuthorRole.DOCTOR,
            authorUserId: auth.userId,
            body: body.data.body,
            // The doctor authored it, so it is read on their side already.
            readByDoctor: true,
          },
          select: MESSAGE_SELECT,
        });
        await prisma.supportThread.update({
          where: { id: thread.id },
          data: {
            lastMessageAt: row.createdAt,
            lastMessageRole: SupportMessageAuthorRole.DOCTOR,
            // The doctor has answered, so the next admin message must reach
            // them at once instead of sitting out the rest of the window —
            // the mirror of `afterAdminReply` clearing `lastAdminEmailAt`.
            lastDoctorAlertAt: null,
          },
        });

        await notifyAndAlert({
          threadId: thread.id,
          doctorName: auth.fullName,
          snippet: supportSnippet({ body: row.body }),
        });

        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "SUPPORT_MESSAGE_POSTED",
          entityType: "SupportMessage",
          entityId: row.id,
          metadata: { threadId: thread.id },
          request,
        }).catch(() => {});

        const items = await listMessages(thread.id, "doctor");
        return reply.status(201).send(okResponse({ threadId: thread.id, items }));
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not send message"));
      }
    },
  );

  // ── Doctor: POST attachment ──────────────────────────────────────
  app.post(
    "/api/doctor/support/messages/upload",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("File storage is not configured"));
      }

      try {
        const thread = await getOrCreateThread(auth.doctorId);
        const stored = await storeUpload(request, thread.id);
        if (!stored.ok) return reply.status(stored.status).send(errorResponse(stored.message));

        const row = await prisma.supportMessage.create({
          data: {
            threadId: thread.id,
            authorRole: SupportMessageAuthorRole.DOCTOR,
            authorUserId: auth.userId,
            storageKey: stored.storageKey,
            fileName: stored.fileName,
            mimeType: stored.mimeType,
            byteSize: stored.byteSize,
            readByDoctor: true,
          },
          select: MESSAGE_SELECT,
        });
        await prisma.supportThread.update({
          where: { id: thread.id },
          data: {
            lastMessageAt: row.createdAt,
            lastMessageRole: SupportMessageAuthorRole.DOCTOR,
            // The doctor has answered, so the next admin message must reach
            // them at once instead of sitting out the rest of the window —
            // the mirror of `afterAdminReply` clearing `lastAdminEmailAt`.
            lastDoctorAlertAt: null,
          },
        });

        await notifyAndAlert({
          threadId: thread.id,
          doctorName: auth.fullName,
          snippet: supportSnippet({ fileName: stored.fileName }),
        });

        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "SUPPORT_MESSAGE_POSTED",
          entityType: "SupportMessage",
          entityId: row.id,
          metadata: { threadId: thread.id, fileName: stored.fileName },
          request,
        }).catch(() => {});

        const items = await listMessages(thread.id, "doctor");
        return okResponse({ threadId: thread.id, items, uploadedId: row.id });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Upload failed"));
      }
    },
  );

  // ── Doctor: GET attachment ───────────────────────────────────────
  app.get("/api/doctor/support/messages/:messageId/download", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const params = messageIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid params"));

    try {
      // Scoping the lookup to this doctor's own thread IS the authorization —
      // another doctor's message id simply doesn't exist here.
      const msg = await prisma.supportMessage.findFirst({
        where: {
          id: params.data.messageId,
          thread: { doctorId: auth.doctorId },
        },
        select: { storageKey: true, fileName: true, mimeType: true },
      });
      if (!msg?.storageKey) return reply.status(404).send(errorResponse("File not found"));

      return streamAttachment(reply, { ...msg, storageKey: msg.storageKey });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not retrieve file"));
    }
  });

  // ── Admin: GET thread list (inbox) ───────────────────────────────
  app.get(
    "/api/admin/support/threads",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const admin = await verifyGlobalAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
      const actor = resolveAdminSessionActor(request);

      try {
        const threads = await prisma.supportThread.findMany({
          where: { lastMessageAt: { not: null } },
          orderBy: { lastMessageAt: "desc" },
          take: THREAD_LIST_CAP,
          select: {
            id: true,
            doctorId: true,
            lastMessageAt: true,
            doctor: { select: { fullName: true, slug: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: MESSAGE_SELECT,
            },
            readStates: actor
              ? { where: { adminUserId: actor.userId }, select: { lastReadAt: true } }
              : { where: { adminUserId: "" }, select: { lastReadAt: true } },
          },
        });

        // Per-thread unread = doctor messages newer than this admin's cursor.
        // Capped at THREAD_LIST_CAP rows, so a fan of counts is cheap enough
        // and keeps the cursor comparison in Prisma rather than raw SQL.
        const items = await Promise.all(
          threads.map(async (t) => {
            const lastReadAt = t.readStates[0]?.lastReadAt ?? null;
            const unreadCount = await prisma.supportMessage.count({
              where: {
                threadId: t.id,
                authorRole: SupportMessageAuthorRole.DOCTOR,
                ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
              },
            });
            const last = t.messages[0];
            return {
              threadId: t.id,
              doctorId: t.doctorId,
              doctorName: t.doctor?.fullName ?? "Unknown doctor",
              doctorSlug: t.doctor?.slug ?? null,
              lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
              lastMessage: last ? serializeMessage(last, "admin", t.id) : null,
              unreadCount,
            };
          }),
        );

        return okResponse({ items, viewerUserId: actor?.userId ?? null });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load support threads"));
      }
    },
  );

  // ── Admin: GET doctors (picker for a new conversation) ───────────
  // Purpose-built and deliberately not `/api/admin/doctors`: the picker needs
  // three fields per doctor, not the full AdminDoctorDto, and it must list
  // every active doctor — including those who have never written in and so
  // have no thread row yet.
  app.get(
    "/api/admin/support/doctors",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const admin = await verifyGlobalAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));

      try {
        const doctors = await prisma.doctor.findMany({
          where: { active: true },
          orderBy: { fullName: "asc" },
          select: {
            id: true,
            fullName: true,
            country: { select: { code: true } },
            supportThread: { select: { id: true } },
          },
        });

        return okResponse({
          items: doctors.map((d) => ({
            doctorId: d.id,
            fullName: d.fullName,
            countryCode: d.country?.code ?? null,
            /** Non-null when a thread already exists — the UI reuses it. */
            threadId: d.supportThread?.id ?? null,
          })),
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load doctors"));
      }
    },
  );

  // ── Admin: POST start a conversation with a doctor ────────────────
  // The opening message is required, not optional: a thread with no messages
  // is invisible in the inbox (which orders on `lastMessageAt`) and would
  // notify the doctor about nothing. Creating the thread and writing the first
  // message in one call keeps both surfaces consistent.
  app.post(
    "/api/admin/support/threads",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const admin = await verifyGlobalAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
      // Same reasoning as the reply route: the maintenance-token fallback has
      // no user row, so it cannot author a named message.
      const actor = resolveAdminSessionActor(request);
      if (!actor) return reply.status(401).send(errorResponse("Not authenticated"));

      const body = startThreadBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid message", body.error.flatten()));
      }

      try {
        const doctor = await prisma.doctor.findUnique({
          where: { id: body.data.doctorId },
          select: { id: true },
        });
        if (!doctor) return reply.status(404).send(errorResponse("Doctor not found"));

        // Upsert, not create: the doctor may already have a thread (they wrote
        // in once, or an admin opened one before). One thread per doctor.
        const thread = await getOrCreateThread(doctor.id);

        const row = await prisma.supportMessage.create({
          data: {
            threadId: thread.id,
            authorRole: SupportMessageAuthorRole.ADMIN,
            authorUserId: actor.userId,
            body: body.data.body,
            readByDoctor: false,
          },
          select: MESSAGE_SELECT,
        });

        await afterAdminReply(thread.id, actor.userId, row.createdAt);
        notifyDoctorOfReply(doctor.id, thread.id, row);

        recordAudit({
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: "SUPPORT_MESSAGE_POSTED",
          entityType: "SupportMessage",
          entityId: row.id,
          metadata: { threadId: thread.id, initiatedByAdmin: true },
          request,
        }).catch(() => {});

        const items = await listMessages(thread.id, "admin");
        return reply.status(201).send(okResponse({ threadId: thread.id, items }));
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not start the conversation"));
      }
    },
  );

  // ── Admin: GET one thread (and bump read cursor) ─────────────────
  app.get("/api/admin/support/threads/:threadId", async (request, reply) => {
    const admin = await verifyGlobalAdminAccess(request);
    if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
    const actor = resolveAdminSessionActor(request);

    const params = threadIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid thread id"));

    try {
      const thread = await prisma.supportThread.findUnique({
        where: { id: params.data.threadId },
        select: { id: true, doctorId: true, doctor: { select: { fullName: true } } },
      });
      if (!thread) return reply.status(404).send(errorResponse("Support thread not found"));

      const items = await listMessages(thread.id, "admin");

      if (actor) {
        await prisma.supportThreadRead.upsert({
          where: { threadId_adminUserId: { threadId: thread.id, adminUserId: actor.userId } },
          create: { threadId: thread.id, adminUserId: actor.userId, lastReadAt: new Date() },
          update: { lastReadAt: new Date() },
        });
      }

      return okResponse({
        threadId: thread.id,
        doctorId: thread.doctorId,
        doctorName: thread.doctor?.fullName ?? "Unknown doctor",
        // Lets the client label this admin's own bubbles "Me" without a
        // second round-trip.
        viewerUserId: actor?.userId ?? null,
        items,
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load support thread"));
    }
  });

  // ── Admin: POST reply ────────────────────────────────────────────
  app.post(
    "/api/admin/support/threads/:threadId/messages",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const admin = await verifyGlobalAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
      // Required, not optional: the maintenance-token fallback has no user row,
      // so it cannot author a named reply (same reasoning as S-008 on the
      // internal-messages route).
      const actor = resolveAdminSessionActor(request);
      if (!actor) return reply.status(401).send(errorResponse("Not authenticated"));

      const params = threadIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid thread id"));

      const body = postBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid message", body.error.flatten()));
      }

      try {
        const thread = await prisma.supportThread.findUnique({
          where: { id: params.data.threadId },
          select: { id: true, doctorId: true },
        });
        if (!thread) return reply.status(404).send(errorResponse("Support thread not found"));

        const row = await prisma.supportMessage.create({
          data: {
            threadId: thread.id,
            // SUPER_ADMIN also stamps as ADMIN for display; the real role is
            // preserved on the audit row below.
            authorRole: SupportMessageAuthorRole.ADMIN,
            authorUserId: actor.userId,
            body: body.data.body,
            readByDoctor: false,
          },
          select: MESSAGE_SELECT,
        });

        await afterAdminReply(thread.id, actor.userId, row.createdAt);
        notifyDoctorOfReply(thread.doctorId, thread.id, row);

        recordAudit({
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: "SUPPORT_MESSAGE_POSTED",
          entityType: "SupportMessage",
          entityId: row.id,
          metadata: { threadId: thread.id },
          request,
        }).catch(() => {});

        const items = await listMessages(thread.id, "admin");
        return reply.status(201).send(okResponse({ threadId: thread.id, items }));
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not post reply"));
      }
    },
  );

  // ── Admin: POST attachment ───────────────────────────────────────
  app.post(
    "/api/admin/support/threads/:threadId/messages/upload",
    { config: { rateLimit: { max: 40, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const admin = await verifyGlobalAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
      const actor = resolveAdminSessionActor(request);
      if (!actor) return reply.status(401).send(errorResponse("Not authenticated"));
      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("File storage is not configured"));
      }

      const params = threadIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid thread id"));

      try {
        const thread = await prisma.supportThread.findUnique({
          where: { id: params.data.threadId },
          select: { id: true, doctorId: true },
        });
        if (!thread) return reply.status(404).send(errorResponse("Support thread not found"));

        const stored = await storeUpload(request, thread.id);
        if (!stored.ok) return reply.status(stored.status).send(errorResponse(stored.message));

        const row = await prisma.supportMessage.create({
          data: {
            threadId: thread.id,
            authorRole: SupportMessageAuthorRole.ADMIN,
            authorUserId: actor.userId,
            storageKey: stored.storageKey,
            fileName: stored.fileName,
            mimeType: stored.mimeType,
            byteSize: stored.byteSize,
            readByDoctor: false,
          },
          select: MESSAGE_SELECT,
        });

        await afterAdminReply(thread.id, actor.userId, row.createdAt);
        notifyDoctorOfReply(thread.doctorId, thread.id, row);

        recordAudit({
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: "SUPPORT_MESSAGE_POSTED",
          entityType: "SupportMessage",
          entityId: row.id,
          metadata: { threadId: thread.id, fileName: stored.fileName },
          request,
        }).catch(() => {});

        const items = await listMessages(thread.id, "admin");
        return okResponse({ threadId: thread.id, items, uploadedId: row.id });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Upload failed"));
      }
    },
  );

  // ── Admin: GET attachment ────────────────────────────────────────
  app.get(
    "/api/admin/support/threads/:threadId/messages/:messageId/download",
    async (request, reply) => {
      const admin = await verifyGlobalAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));

      const params = adminMessageParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid params"));

      try {
        const msg = await prisma.supportMessage.findFirst({
          where: { id: params.data.messageId, threadId: params.data.threadId },
          select: { storageKey: true, fileName: true, mimeType: true },
        });
        if (!msg?.storageKey) return reply.status(404).send(errorResponse("File not found"));

        return streamAttachment(reply, { ...msg, storageKey: msg.storageKey });
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not retrieve file"));
      }
    },
  );

  // ── Admin: mark this thread's support bells read ─────────────────
  // Without this the admin bell count only grows: opening a thread bumps the
  // read cursor but leaves the Notification rows unread.
  app.post(
    "/api/admin/support/threads/:threadId/notifications/read",
    async (request, reply) => {
      const admin = await verifyGlobalAdminAccess(request);
      if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
      const actor = resolveAdminSessionActor(request);
      if (!actor) return reply.status(401).send(errorResponse("Not authenticated"));

      const params = threadIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid thread id"));

      try {
        const result = await prisma.notification.updateMany({
          where: {
            recipientUserId: actor.userId,
            type: "SUPPORT_MESSAGE",
            readAt: null,
            payload: { path: ["threadId"], equals: params.data.threadId },
          },
          data: { readAt: new Date() },
        });
        return okResponse({ markedRead: result.count });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not mark notifications read"));
      }
    },
  );

  // ── Shared helpers bound to this plugin's logger ──────────────────

  /** Bell fan-out + throttled email. Neither may fail the doctor's POST. */
  async function notifyAndAlert(args: {
    threadId: string;
    doctorName: string;
    snippet: string | null;
  }) {
    notifySupportAdmins("SUPPORT_MESSAGE", {
      threadId: args.threadId,
      snippet: args.snippet ?? undefined,
      byUserName: args.doctorName,
      byRole: "DOCTOR",
    }).catch((err) => app.log.warn({ err }, "notifySupportAdmins failed (doctor→support)"));

    void alertAdminsOfSupportMessage({
      threadId: args.threadId,
      doctorName: args.doctorName,
      snippet: args.snippet,
      log: app.log,
    });
  }

  /**
   * Bookkeeping after an admin writes: order the inbox, clear the email
   * throttle (the thread is answered, so the doctor's next message should
   * alert immediately), and mark it read for the admin who just replied.
   */
  async function afterAdminReply(threadId: string, adminUserId: string, at: Date) {
    await prisma.supportThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: at,
        lastMessageRole: SupportMessageAuthorRole.ADMIN,
        lastAdminEmailAt: null,
      },
    });
    await prisma.supportThreadRead.upsert({
      where: { threadId_adminUserId: { threadId, adminUserId } },
      create: { threadId, adminUserId, lastReadAt: at },
      update: { lastReadAt: at },
    });
  }

  /**
   * Bell + throttled email/WhatsApp for the doctor. The bell always fires; the
   * email and WhatsApp share one `SUPPORT_ALERT_THROTTLE_MINUTES` window per
   * thread — the mirror of `notifyAndAlert` on the doctor → admin side.
   * Neither may fail the admin's POST.
   */
  function notifyDoctorOfReply(
    doctorId: string,
    threadId: string,
    row: { body: string | null; fileName: string | null; author: { fullName: string | null } | null },
  ) {
    const snippet = supportSnippet({ body: row.body, fileName: row.fileName });
    const adminName = firstName(row.author?.fullName);

    notifyDoctor(doctorId, "SUPPORT_REPLY", {
      threadId,
      snippet: snippet ?? undefined,
      byUserName: adminName,
      byRole: "ADMIN",
    }).catch((err) => app.log.warn({ err }, "notifyDoctor failed (support reply)"));

    void alertDoctorOfSupportMessage({
      threadId,
      doctorId,
      adminName,
      snippet,
      log: app.log,
    });
  }
};

type StoreUploadResult =
  | {
      ok: true;
      storageKey: string;
      fileName: string;
      mimeType: string;
      byteSize: number;
    }
  | { ok: false; status: number; message: string };

/**
 * Read the multipart body, magic-byte verify it, and put it in object storage.
 * Shared by both surfaces so the doctor and admin upload paths can't drift on
 * validation. Never trusts the declared content-type on its own.
 */
async function storeUpload(
  request: FastifyRequest,
  threadId: string,
): Promise<StoreUploadResult> {
  const file = await request.file();
  if (!file) {
    return { ok: false, status: 400, message: 'Expected a file field named "file"' };
  }

  const declaredMime: string = file.mimetype ?? "";
  if (!ALLOWED_MIME.has(declaredMime)) {
    return { ok: false, status: 415, message: "Unsupported file type (images and PDF only)" };
  }

  const buffer: Buffer = await file.toBuffer();
  if (buffer.length > MAX_BYTES) {
    return { ok: false, status: 413, message: "File too large (max 10 MB)" };
  }
  const mimeType = verifySniffedMime(buffer, declaredMime, ALLOWED_MIME);
  if (!mimeType) {
    return { ok: false, status: 400, message: "File content does not match an allowed type" };
  }

  const fileName = sanitizeOriginalFilename(file.filename ?? "file");
  const storageKey = `support-chat/${threadId}/${randomUUID()}-${fileName}`;
  await putObject(storageKey, buffer, mimeType);

  return { ok: true, storageKey, fileName, mimeType, byteSize: buffer.length };
}

async function streamAttachment(
  reply: FastifyReply,
  msg: { storageKey: string; fileName: string | null; mimeType: string | null },
) {
  const obj = await getObject(msg.storageKey);
  reply.header("content-type", msg.mimeType ?? "application/octet-stream");
  reply.header("content-disposition", `inline; filename="${msg.fileName ?? "file"}"`);
  return reply.send(streamToNodeReadable(obj.Body));
}

export default doctorSupportRoute;
