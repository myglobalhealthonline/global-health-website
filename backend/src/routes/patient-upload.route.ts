import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  putObject,
  isMediaStorageConfigured,
} from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  buildPatientUploadUrl,
  createPatientUploadToken,
  verifyPatientUploadToken,
} from "../modules/patient-upload/patient-upload-link.service.js";
import {
  parseUploadLinkChannels,
  sendAppointmentUploadLink,
} from "../modules/patient-upload/appointment-upload-link.service.js";
import { resolveAdminSessionActor, verifyAdminAccess } from "../utils/admin-auth.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { upsertPatientProfileByEmail } from "../modules/patient-profile/patient-profile.service.js";
import {
  sendPatientUploadLinkEmail,
  sendDoctorPatientUploadNotificationEmail,
} from "../lib/email/templates.js";
import { sendWhatsAppText } from "../lib/whatsapp/wasender.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024;

const patientUploadRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/public/patient-upload",
    { config: { rateLimit: { max: 30, timeWindow: "10 minutes" } } },
    async (request, reply) => {
    const token = (request.query as { token?: string }).token?.trim();
    if (!token) return reply.status(400).send(errorResponse("token is required"));
    const verified = await verifyPatientUploadToken(token);
    if (!verified.ok) {
      return reply.status(400).send(errorResponse(verified.message));
    }
    const profile = await prisma.patientProfile.findUnique({
      where: { email: verified.email },
      select: { fullName: true, email: true },
    });
    return okResponse({
      email: verified.email,
      fullName: profile?.fullName ?? null,
      appointmentId: verified.appointmentId,
    });
    },
  );

  app.post(
    "/api/public/patient-upload",
    { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } },
    async (request, reply) => {
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Upload storage is not configured"));
    }
    const parts = request.parts();
    let token = "";
    let fileBuffer: Buffer | null = null;
    let fileName = "upload";
    let mimetype = "application/octet-stream";

    for await (const part of parts) {
      if (part.type === "field" && part.fieldname === "token") {
        token = String(part.value);
      }
      if (part.type === "file" && part.fieldname === "file") {
        fileBuffer = await part.toBuffer();
        fileName = part.filename;
        mimetype = part.mimetype;
      }
    }

    const verified = await verifyPatientUploadToken(token);
    if (!verified.ok) {
      return reply.status(400).send(errorResponse(verified.message));
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send(errorResponse("File is required"));
    }
    if (fileBuffer.length > MAX_BYTES) {
      return reply.status(413).send(errorResponse("File too large (max 10 MB)"));
    }
    const sniffedMime = verifySniffedMime(fileBuffer, mimetype, ALLOWED_MIME);
    if (!sniffedMime) {
      return reply.status(400).send(errorResponse("File content does not match an allowed type"));
    }
    mimetype = sniffedMime;

    try {
      const { profile } = await upsertPatientProfileByEmail({ email: verified.email });
      // Token carries appointmentId + doctorId — bind upload to the exact
      // appointment the doctor minted the link for. Re-check the row still
      // exists and the email matches so a stale token can't slot files
      // into an appointment that was reassigned.
      const appt = await prisma.appointment.findFirst({
        where: {
          id: verified.appointmentId,
          doctorId: verified.doctorId,
          email: { equals: verified.email, mode: "insensitive" },
        },
        select: { id: true, doctorId: true, fullName: true },
      });
      if (!appt?.doctorId) {
        return reply.status(404).send(errorResponse("No appointment found for this patient"));
      }

      const safeName = sanitizeOriginalFilename(fileName);
      // ponytail: profile.id (cuid, non-PII) instead of raw email — email
      // was leaking into S3 keys/logs/backups. Original filename still
      // goes to the DB row (label/fileName below), never into the key.
      const storageKey = `patient-upload/${profile.id}/${randomUUID()}-${safeName}`;
      await putObject(storageKey, fileBuffer, mimetype);

      // v3 tokens bind the upload to the exact exams prescription it answers —
      // tag the file so the doctor sees which prescription it belongs to.
      let label = `Patient upload: ${safeName}`;
      let sourceGeneratedDocumentId: string | undefined;
      if (verified.documentId) {
        const rx = await prisma.generatedDocument.findFirst({
          where: { id: verified.documentId, appointmentId: appt.id },
          select: { id: true, prescriptionNumber: true },
        });
        if (rx) {
          sourceGeneratedDocumentId = rx.id;
          const n = rx.prescriptionNumber != null ? ` #${rx.prescriptionNumber}` : "";
          label = `Exam result (prescription${n}): ${safeName}`;
        }
      }

      const doc = await prisma.appointmentDocument.create({
        data: {
          appointmentId: appt.id,
          doctorId: appt.doctorId,
          label,
          storageKey,
          mimetype,
          byteSize: fileBuffer.length,
          ...(sourceGeneratedDocumentId ? { sourceGeneratedDocumentId } : {}),
        },
      });

      // Notify doctor — fire-and-forget, never fail the upload response.
      void (async () => {
        try {
          const [doctorUser, doctor] = await Promise.all([
            prisma.user.findFirst({
              where: { doctorId: appt.doctorId },
              select: { email: true },
            }),
            prisma.doctor.findUnique({
              where: { id: appt.doctorId! },
              select: { fullName: true, whatsappNumber: true },
            }),
          ]);

          const patientDisplayName = appt.fullName ?? verified.email;
          const doctorName = doctor?.fullName ?? "Doctor";

          if (doctorUser?.email) {
            await sendDoctorPatientUploadNotificationEmail({
              to: doctorUser.email,
              doctorName,
              patientName: patientDisplayName,
              patientEmail: verified.email,
              fileLabel: label,
            }).catch((err) => app.log.warn({ err }, "patient-upload: doctor email notification failed"));
          }

          if (doctor?.whatsappNumber) {
            const wa = await sendWhatsAppText({
              to: doctor.whatsappNumber,
              message:
                `Patient upload received — ${patientDisplayName} uploaded exam results:\n${label}`,
            });
            if (!wa.ok && !wa.skipped) {
              app.log.warn({ wa }, "patient-upload: doctor whatsapp notification failed");
            }
          }
        } catch (err) {
          app.log.warn({ err }, "patient-upload: doctor notification threw");
        }
      })();

      return reply.status(201).send(
        okResponse(
          { documentId: doc.id, label: doc.label },
          "File uploaded",
        ),
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not upload file"));
    }
    },
  );

  app.post<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/upload-link",
    // S-020: capability-token issuance — tighter, fail-closed limit so a
    // Redis outage doesn't fall back to the loose global default.
    { config: { rateLimit: { max: 20, timeWindow: "1 hour", skipOnError: false } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      let email = "";
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      if (!email) return reply.status(400).send(errorResponse("Email required"));

      // Pick the most recent appointment between THIS doctor and patient —
      // bind that exact appointment into the token so uploads can't land on
      // a different doctor's row even if the patient also sees other doctors.
      const hasAppt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, fullName: true, phone: true },
      });
      if (!hasAppt) {
        return reply.status(404).send(errorResponse("Patient not found for this doctor"));
      }

      const { token, expiresAt } = await createPatientUploadToken({
        email,
        appointmentId: hasAppt.id,
        doctorId: auth.doctorId,
      });
      const link = buildPatientUploadUrl(token);

      const deliveryWarnings: string[] = [];

      try {
        await sendPatientUploadLinkEmail({
          to: email,
          patientName: hasAppt.fullName ?? email,
          link,
        });
      } catch (err) {
        app.log.error({ err }, "patient-upload: email send failed");
        deliveryWarnings.push("email");
      }

      if (hasAppt.phone) {
        try {
          const wa = await sendWhatsAppText({
            to: hasAppt.phone,
            message: `Upload your medical files securely:\n${link}`,
          });
          if (!wa.ok && !wa.skipped) {
            app.log.warn({ wa }, "patient-upload: whatsapp send failed");
            deliveryWarnings.push("whatsapp");
          }
        } catch (err) {
          app.log.error({ err }, "patient-upload: whatsapp send threw");
          deliveryWarnings.push("whatsapp");
        }
      }

      return okResponse({
        link,
        expiresAt: expiresAt.toISOString(),
        deliveryWarnings: deliveryWarnings.length ? deliveryWarnings : undefined,
      });
    },
  );

  /**
   * General appointment-scoped upload link — "send the patient a link so they
   * can attach files to THIS appointment". Registered twice with different
   * auth gates and different doctor scoping:
   *
   *   POST /api/doctor/appointments/:id/upload-link  — doctor's own rows only
   *   POST /api/admin/appointments/:id/upload-link   — any appointment
   *
   * Body: `{ channels?: ("email" | "whatsapp")[] }` — omitted/empty means both.
   */
  const uploadLinkRateLimit = {
    config: { rateLimit: { max: 20, timeWindow: "1 hour", skipOnError: false } },
  } as const;

  app.post<{ Params: { id: string }; Body: { channels?: unknown } }>(
    "/api/doctor/appointments/:id/upload-link",
    uploadLinkRateLimit,
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const result = await sendAppointmentUploadLink({
          appointmentId: request.params.id,
          // ADMINs reaching this route still carry a linked doctorId, so
          // scoping to it is correct for both roles here.
          doctorIdScope: auth.doctorId,
          channels: parseUploadLinkChannels(request.body?.channels),
        });
        if (!result.ok) {
          return reply.status(result.status).send(errorResponse(result.message));
        }
        void recordAudit({
          actorUserId: auth.userId,
          actorRole: auth.role,
          action: "SHARE_LINK_CREATED",
          entityType: "PatientUploadLink",
          entityId: request.params.id,
          metadata: { kind: "appointment-upload-link", sent: result.sent },
          request,
        });
        return okResponse(
          {
            link: result.link,
            expiresAt: result.expiresAt.toISOString(),
            sent: result.sent,
            failed: result.failed,
            missingPhone: result.missingPhone,
          },
          "Upload link sent",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not send upload link"));
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { channels?: unknown } }>(
    "/api/admin/appointments/:id/upload-link",
    uploadLinkRateLimit,
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const result = await sendAppointmentUploadLink({
          appointmentId: request.params.id,
          doctorIdScope: null,
          channels: parseUploadLinkChannels(request.body?.channels),
        });
        if (!result.ok) {
          return reply.status(result.status).send(errorResponse(result.message));
        }
        const actor = resolveAdminSessionActor(request);
        void recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "SHARE_LINK_CREATED",
          entityType: "PatientUploadLink",
          entityId: request.params.id,
          metadata: { kind: "appointment-upload-link", sent: result.sent },
          request,
        });
        return okResponse(
          {
            link: result.link,
            expiresAt: result.expiresAt.toISOString(),
            sent: result.sent,
            failed: result.failed,
            missingPhone: result.missingPhone,
          },
          "Upload link sent",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not send upload link"));
      }
    },
  );
};

export default patientUploadRoute;
