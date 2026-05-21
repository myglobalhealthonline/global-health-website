import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
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
import { upsertPatientProfileByEmail } from "../modules/patient-profile/patient-profile.service.js";
import { sendPatientUploadLinkEmail } from "../lib/email/templates.js";
import { sendWhatsAppText } from "../lib/whatsapp/wasender.js";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024;

const patientUploadRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/public/patient-upload", async (request, reply) => {
    const token = (request.query as { token?: string }).token?.trim();
    if (!token) return reply.status(400).send(errorResponse("token is required"));
    const verified = verifyPatientUploadToken(token);
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
  });

  app.post("/api/public/patient-upload", async (request, reply) => {
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

    const verified = verifyPatientUploadToken(token);
    if (!verified.ok) {
      return reply.status(400).send(errorResponse(verified.message));
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send(errorResponse("File is required"));
    }
    if (fileBuffer.length > MAX_BYTES) {
      return reply.status(413).send(errorResponse("File too large (max 10 MB)"));
    }
    if (!ALLOWED_MIME.has(mimetype)) {
      return reply.status(400).send(errorResponse("File type not allowed"));
    }

    try {
      await upsertPatientProfileByEmail({ email: verified.email });
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
        select: { id: true, doctorId: true },
      });
      if (!appt?.doctorId) {
        return reply.status(404).send(errorResponse("No appointment found for this patient"));
      }

      const safeName = sanitizeOriginalFilename(fileName);
      const storageKey = `patient-upload/${verified.email}/${randomUUID()}-${safeName}`;
      await putObject(storageKey, fileBuffer, mimetype);

      const doc = await prisma.appointmentDocument.create({
        data: {
          appointmentId: appt.id,
          doctorId: appt.doctorId,
          label: `Patient upload: ${safeName}`,
          storageKey,
          mimetype,
          byteSize: fileBuffer.length,
        },
      });

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
  });

  app.post<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/upload-link",
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

      const { token, expiresAt } = createPatientUploadToken({
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
};

export default patientUploadRoute;
