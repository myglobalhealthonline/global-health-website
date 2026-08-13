import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  getObject,
  isMediaStorageConfigured,
  putObject,
  streamToNodeReadable,
} from "../services/object-storage.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  getConfidentialityStatus,
  acceptConfidentialityAgreement,
  listDoctorAgreementStatuses,
  hasAcceptedCurrentAgreement,
  getDoctorAgreementLocale,
  agreementTextFor,
  CURRENT_AGREEMENT_VERSION,
} from "../modules/confidentiality/confidentiality.service.js";
import { renderConfidentialityAgreementPdf } from "../modules/confidentiality/confidentiality-pdf.js";
import {
  buildSignedAgreementKey,
  CONFIDENTIALITY_SIGNED_ALLOWED_MIME,
  CONFIDENTIALITY_SIGNED_MAX_BYTES,
  listDoctorSignedAgreements,
  parseSignedAgreementKey,
} from "../modules/confidentiality/confidentiality-storage.js";
import { prisma } from "../db/prisma.js";

const downloadQuery = z.object({ key: z.string().min(1).max(400) });

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Filename-safe slug of the doctor's name for the generated PDF. */
function nameSlug(fullName: string): string {
  return (
    fullName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "doctor"
  );
}

const doctorConfidentialityRoute: FastifyPluginAsync = async (app) => {
  // ─── Doctor: read own status ──────────────────────────────────────────────

  app.get(
    "/api/doctor/confidentiality-agreement",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "DOCTOR") {
        return reply.status(403).send(errorResponse("Doctor access required"));
      }
      const user = await prisma.user.findUnique({
        where: { id: request.authUser.sub },
        select: { doctorProfile: { select: { id: true } } },
      });
      const doctorProfile = user?.doctorProfile;
      if (!doctorProfile) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      try {
        const [status, locale] = await Promise.all([
          getConfidentialityStatus(doctorProfile.id),
          getDoctorAgreementLocale(doctorProfile.id),
        ]);
        return okResponse({ ...status, agreementText: agreementTextFor(locale) });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not read confidentiality status");
      }
    },
  );

  // ─── Doctor: compliance nudge status (confidentiality + 2FA) ─────────────

  app.get(
    "/api/doctor/compliance-status",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "DOCTOR") {
        return reply.status(403).send(errorResponse("Doctor access required"));
      }
      const user = await prisma.user.findUnique({
        where: { id: request.authUser.sub },
        select: {
          twoFactorVerifiedAt: true,
          doctorProfile: { select: { id: true } },
        },
      });
      const doctorProfile = user?.doctorProfile;
      if (!doctorProfile) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      try {
        const confidentialityAccepted = await hasAcceptedCurrentAgreement(doctorProfile.id);
        return okResponse({
          confidentialityAccepted,
          twoFactorEnabled: user.twoFactorVerifiedAt !== null,
        });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not read compliance status");
      }
    },
  );

  // ─── Doctor: accept agreement ─────────────────────────────────────────────

  app.post(
    "/api/doctor/confidentiality-agreement",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "DOCTOR") {
        return reply.status(403).send(errorResponse("Doctor access required"));
      }
      const user = await prisma.user.findUnique({
        where: { id: request.authUser.sub },
        select: { doctorProfile: { select: { id: true } } },
      });
      const doctorProfile = user?.doctorProfile;
      if (!doctorProfile) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      try {
        const ipAddress = (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
          ?? request.ip
          ?? null;
        const userAgent = request.headers["user-agent"] ?? null;
        await acceptConfidentialityAgreement(doctorProfile.id, ipAddress, userAgent);
        return okResponse({ accepted: true }, "Confidentiality agreement accepted");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not record agreement");
      }
    },
  );

  // ─── Doctor: download the printable, signable PDF ─────────────────────────

  app.get("/api/doctor/confidentiality-agreement/pdf", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const doctor = await prisma.doctor.findUnique({
      where: { id: auth.doctorId },
      select: {
        fullName: true,
        title: true,
        country: { select: { name: true } },
      },
    });
    if (!doctor) return reply.status(404).send(errorResponse("Doctor profile not found"));

    try {
      const [status, locale] = await Promise.all([
        getConfidentialityStatus(auth.doctorId),
        getDoctorAgreementLocale(auth.doctorId),
      ]);
      const pdf = await renderConfidentialityAgreementPdf({
        doctor: {
          fullName: doctor.fullName,
          title: doctor.title,
          countryName: doctor.country?.name ?? null,
          email: auth.email,
        },
        locale,
        acceptedAt: status.accepted ? status.acceptedAt : null,
        acceptedVersion: status.accepted ? status.agreementVersion : null,
        issuedAt: new Date(),
      });
      const filename = `confidentiality-agreement-v${CURRENT_AGREEMENT_VERSION}-${nameSlug(doctor.fullName)}.pdf`;
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .header("Cache-Control", "private, no-store")
        .send(pdf);
    } catch (error) {
      return replyWithError(reply, app.log, error, "Could not generate the agreement PDF");
    }
  });

  // ─── Doctor: signed-copy uploads (list / upload / download) ───────────────

  app.get("/api/doctor/confidentiality-agreement/signed", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }
    try {
      const items = await listDoctorSignedAgreements(auth.doctorId);
      return reply.send(okResponse({ items }));
    } catch (error) {
      return replyWithError(reply, app.log, error, "Could not list signed agreements");
    }
  });

  app.get("/api/doctor/confidentiality-agreement/signed/download", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const parsed = downloadQuery.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid key"));
    const meta = parseSignedAgreementKey(parsed.data.key);
    // Scope: a doctor may only read files under their OWN prefix.
    if (!meta || meta.doctorId !== auth.doctorId) {
      return reply.status(404).send(errorResponse("File not found"));
    }
    try {
      const obj = await getObject(parsed.data.key);
      const stream = streamToNodeReadable(obj.Body);
      if (!stream) return reply.status(404).send(errorResponse("File not found"));
      return reply
        .header("Content-Type", obj.ContentType ?? "application/octet-stream")
        .header("Content-Disposition", `attachment; filename="${meta.filename}"`)
        .header("Cache-Control", "private, no-store")
        .send(stream);
    } catch (error) {
      app.log.error(error);
      return reply.status(404).send(errorResponse("File not found"));
    }
  });

  app.post("/api/doctor/confidentiality-agreement/signed", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send(errorResponse('Expected one file field named "file"'));
    }

    const declaredMime = file.mimetype ?? "";
    if (!CONFIDENTIALITY_SIGNED_ALLOWED_MIME.has(declaredMime)) {
      return reply
        .status(415)
        .send(errorResponse("Unsupported file type — upload a PDF or an image of the signed copy"));
    }
    const buffer = await file.toBuffer();
    if (buffer.length > CONFIDENTIALITY_SIGNED_MAX_BYTES) {
      return reply.status(413).send(errorResponse("File too large (max 10MB)"));
    }
    const mimetype = verifySniffedMime(buffer, declaredMime, CONFIDENTIALITY_SIGNED_ALLOWED_MIME);
    if (!mimetype) {
      return reply
        .status(400)
        .send(errorResponse("File content does not match an allowed type"));
    }

    const originalName =
      file.filename ?? `signed-confidentiality-agreement.${EXT_BY_MIME[mimetype] ?? "pdf"}`;
    // The signed copy is always filed against the CURRENT agreement version —
    // that's the text the doctor just downloaded and signed.
    const key = buildSignedAgreementKey(auth.doctorId, CURRENT_AGREEMENT_VERSION, originalName);
    try {
      await putObject(key, buffer, mimetype);
    } catch (error) {
      return replyWithError(reply, app.log, error, "Upload failed");
    }

    try {
      await recordAudit({
        action: "DOCUMENT_UPLOADED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        actorUserId: auth.userId,
        metadata: {
          kind: "signed-confidentiality-agreement",
          agreementVersion: CURRENT_AGREEMENT_VERSION,
          key,
        },
      });
    } catch {
      // Audit is best-effort — the upload already succeeded.
    }

    return reply.send(
      okResponse({
        item: {
          key,
          doctorId: auth.doctorId,
          agreementVersion: CURRENT_AGREEMENT_VERSION,
          filename: originalName,
          size: buffer.length,
          uploadedAt: null,
        },
      }),
    );
  });

  // ─── Admin: one doctor's agreement status + signed uploads ────────────────

  app.get<{ Params: { id: string } }>(
    "/api/admin/doctors/:id/confidentiality",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const doctorId = request.params.id;
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, fullName: true },
      });
      if (!doctor) return reply.status(404).send(errorResponse("Doctor not found"));
      try {
        const status = await getConfidentialityStatus(doctorId);
        // Storage may be unconfigured in a local/dev backend — the status is
        // still useful, so degrade to an empty list instead of 503ing.
        const signedDocuments = isMediaStorageConfigured()
          ? await listDoctorSignedAgreements(doctorId)
          : [];
        return okResponse({
          ...status,
          storageConfigured: isMediaStorageConfigured(),
          signedDocuments,
        });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not read confidentiality record");
      }
    },
  );

  // ─── Admin: download any doctor's signed copy ─────────────────────────────

  app.get("/api/admin/confidentiality-signed/download", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const parsed = downloadQuery.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid key"));
    const meta = parseSignedAgreementKey(parsed.data.key);
    if (!meta) return reply.status(404).send(errorResponse("File not found"));
    try {
      const obj = await getObject(parsed.data.key);
      const stream = streamToNodeReadable(obj.Body);
      if (!stream) return reply.status(404).send(errorResponse("File not found"));
      return reply
        .header("Content-Type", obj.ContentType ?? "application/octet-stream")
        .header("Content-Disposition", `attachment; filename="${meta.filename}"`)
        .header("Cache-Control", "private, no-store")
        .send(stream);
    } catch (error) {
      app.log.error(error);
      return reply.status(404).send(errorResponse("File not found"));
    }
  });

  // ─── Admin: list all doctor agreement statuses ────────────────────────────

  app.get(
    "/api/admin/doctors/confidentiality-status",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const statuses = await listDoctorAgreementStatuses();
        return okResponse({ statuses });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not list confidentiality statuses");
      }
    },
  );
};

export default doctorConfidentialityRoute;
