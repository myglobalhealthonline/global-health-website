import { randomUUID } from "node:crypto";
import { NoSuchKey } from "@aws-sdk/client-s3";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  putObject,
  getObject,
  readObjectBodyToBuffer,
  deleteObject,
  isMediaStorageConfigured,
  MediaObjectNotFoundError,
} from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { contentDisposition } from "../utils/content-disposition.js";
import { isEmailConfigured } from "../lib/email/send-email.js";
import {
  sendClinicDocumentAddedEmail,
  sendDoctorDocumentToPatientEmail,
} from "../lib/email/templates.js";
import { sendWhatsAppText } from "../lib/whatsapp/wasender.js";
import {
  clinicDocumentCopy,
  clinicDocumentWhatsApp,
} from "../modules/notifications/clinic-document-messages.js";
import { resolveNotificationLang } from "../modules/automation/notification-language.js";
import { env } from "../config/env.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  verifyClinicalReadAccess,
  verifyDoctorAccess,
} from "../utils/doctor-auth.js";
import { resolveAdminSessionActor, verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { notifyAdmins, notifyUser } from "../modules/notifications/notify.service.js";
import { sniffFileMime, verifySniffedMime } from "../utils/sniff-mime.js";
import { guardMedicalReadForAppointment, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";

/**
 * Clinical document attachments per appointment.
 *
 *   GET    /api/doctor/appointments/:id/documents
 *   POST   /api/doctor/appointments/:id/documents     — multipart
 *   DELETE /api/doctor/documents/:documentId
 *   GET    /api/doctor/documents/:documentId/download — auth-gated stream
 *
 * Documents are stored in S3 under a `clinical/<doctorId>/<appointmentId>/`
 * prefix. The public `/api/media/*` route refuses any key starting with
 * `clinical/` so the S3 key alone is not enough to fetch the file — the
 * caller MUST hit the auth-gated download endpoint below, which
 * resolves the AppointmentDocument row and verifies the caller's
 * doctorId matches or that an admin is acting on behalf of the doctor.
 *
 * MIME allowlist intentionally narrower than the marketing upload
 * (which accepts SVG / GIF) — clinical attachments are docs, scans,
 * photos.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Types safe to render inline in the doctor portal. Deliberately narrower than
 * ALLOWED_MIME's spirit — no SVG, which is a script container. Membership is
 * decided by sniffed magic bytes, never by the stored (client-declared) MIME.
 */
const INLINE_VIEWABLE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

// ponytail: hard cap on the per-appointment document list — bounds worst
// case, no "load older" UI exists for this yet.
const LIST_CAP = 200;

function buildDownloadPath(documentId: string): string {
  return `/api/doctor/documents/${encodeURIComponent(documentId)}/download`;
}

const appointmentDocumentsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await prisma.appointment.findFirst({
          where: {
            id: request.params.id,
            ...(auth.role === "DOCTOR" && auth.doctorId
              ? { doctorId: auth.doctorId }
              : {}),
          },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        try {
          await guardMedicalReadForAppointment(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            appt.id,
            { resourceType: "MEDICAL_DOC", accessAction: "VIEWED" },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }
        const rows = await prisma.appointmentDocument.findMany({
          where: { appointmentId: appt.id },
          orderBy: { createdAt: "desc" },
          take: LIST_CAP,
          include: { doctor: { select: { fullName: true } } },
        });

        // `doctorId` is the OWNING doctor — for a cross-border disclosure that
        // is the doctor who received the file, not the one who produced it.
        // Resolve the provenance names so the list can credit the real author
        // instead of the viewer's own name.
        const disclosedFromIds = Array.from(
          new Set(
            rows
              .map((r) => r.disclosedFromDoctorId)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const disclosedFromNameById = new Map<string, string>();
        if (disclosedFromIds.length > 0) {
          const doctors = await prisma.doctor.findMany({
            where: { id: { in: disclosedFromIds } },
            select: { id: true, fullName: true },
          });
          for (const d of doctors) disclosedFromNameById.set(d.id, d.fullName);
        }

        return okResponse({
          items: rows.map((r) => ({
            id: r.id,
            label: r.label,
            mimetype: r.mimetype,
            byteSize: r.byteSize,
            url: buildDownloadPath(r.id),
            uploadedBy:
              (r.disclosedFromDoctorId
                ? disclosedFromNameById.get(r.disclosedFromDoctorId)
                : null) ?? r.doctor.fullName,
            createdAt: r.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load documents"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      if (!isMediaStorageConfigured()) {
        return reply
          .status(503)
          .send(errorResponse("Object storage is not configured"));
      }

      const appt = await prisma.appointment.findFirst({
        where: { id: request.params.id, doctorId: auth.doctorId },
        select: { id: true, fullName: true },
      });
      if (!appt) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }

      try {
        await guardMedicalReadForAppointment(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          appt.id,
          { resourceType: "MEDICAL_DOC", accessAction: "UPLOADED" },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      const file = await request.file();
      if (!file) {
        return reply
          .status(400)
          .send(errorResponse('Expected one file field named "file"'));
      }
      const declaredMime = file.mimetype ?? "";
      if (!ALLOWED_MIME.has(declaredMime)) {
        return reply
          .status(415)
          .send(errorResponse("Unsupported file type — use PDF / JPEG / PNG / WebP / AVIF"));
      }
      const buffer = await file.toBuffer();
      if (buffer.length > MAX_BYTES) {
        return reply.status(413).send(errorResponse("File too large (max 10MB)"));
      }
      const mimetype = verifySniffedMime(buffer, declaredMime, ALLOWED_MIME);
      if (!mimetype) {
        return reply
          .status(415)
          .send(errorResponse("File content does not match declared type"));
      }
      // The multipart field is named `file` but the form can also send
      // a sibling `label` field that we pick up off the parts iterator.
      const labelField = file.fields?.["label"];
      let label = "";
      if (labelField && !Array.isArray(labelField) && "value" in labelField) {
        label = String(labelField.value ?? "").trim().slice(0, 200);
      }
      if (!label) {
        label = sanitizeOriginalFilename(file.filename ?? "document");
      }

      const safeName = sanitizeOriginalFilename(file.filename ?? "document");
      const storageKey = `clinical/${auth.doctorId}/${appt.id}/${randomUUID()}-${safeName}`;

      try {
        await putObject(storageKey, buffer, mimetype);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Upload failed"));
      }

      try {
        const row = await prisma.appointmentDocument.create({
          data: {
            appointmentId: appt.id,
            doctorId: auth.doctorId,
            label,
            storageKey,
            mimetype,
            byteSize: buffer.length,
            uploadedByRole: "DOCTOR",
            uploadedByUserId: auth.userId,
          },
        });
        // S-008: PHI document upload — audit failure must be loud, but the
        // enclosing catch below treats any thrown error here as "the DB
        // write failed" and deletes the just-uploaded S3 object to avoid a
        // leak. The upload + DB row already succeeded at this point, so an
        // audit-write failure must NOT trigger that cleanup (it would
        // delete a real file while its DB row stays behind). Log loudly at
        // error level (alertable) instead of throwing into that catch.
        try {
          await recordCriticalAudit({
            actorUserId: auth.userId,
            actorRole: "DOCTOR",
            action: "DOCUMENT_UPLOADED",
            entityType: "AppointmentDocument",
            entityId: row.id,
            metadata: { appointmentId: appt.id, label, byteSize: buffer.length },
            request,
          });
        } catch (auditError) {
          app.log.error(
            { err: auditError, documentId: row.id },
            "CRITICAL: DOCUMENT_UPLOADED audit write failed",
          );
        }
        notifyAdmins("DOCUMENT_UPLOADED", {
          appointmentId: appt.id,
          snippet: `${appt.fullName} · ${label}`,
          byUserName: auth.fullName,
          byRole: "DOCTOR",
        }).catch(() => {});
        return reply.status(201).send(
          okResponse({
            document: {
              id: row.id,
              label: row.label,
              mimetype: row.mimetype,
              byteSize: row.byteSize,
              url: buildDownloadPath(row.id),
              createdAt: row.createdAt.toISOString(),
            },
          }),
        );
      } catch (error) {
        // Cleanup the S3 object if the DB write failed so we don't leak.
        try {
          await deleteObject(storageKey);
        } catch {
          /* best-effort */
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save document"));
      }
    },
  );

  /**
   * Name a file and email it straight to the patient, in one action.
   *
   * Same validation as the plain upload above (allowlist, 10MB, byte-sniff)
   * and the file is stored as an ordinary AppointmentDocument, so a document
   * the patient received is always on the clinical record.
   *
   * On a delivery failure the row and the object are rolled back. There is no
   * `sentToPatient` flag on this table, so leaving a stored-but-unsent file
   * behind would be indistinguishable from a sent one — and the doctor's next
   * move is to retry the same file anyway. Presence therefore means sent.
   */
  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents/send-to-patient",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("Object storage is not configured"));
      }
      if (!isEmailConfigured()) {
        return reply.status(503).send(errorResponse("Email is not configured"));
      }

      const appt = await prisma.appointment.findFirst({
        where: { id: request.params.id, doctorId: auth.doctorId },
        select: { id: true, fullName: true, email: true },
      });
      if (!appt) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }

      try {
        await guardMedicalReadForAppointment(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          appt.id,
          { resourceType: "MEDICAL_DOC", accessAction: "UPLOADED" },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      const file = await request.file();
      if (!file) {
        return reply.status(400).send(errorResponse('Expected one file field named "file"'));
      }
      const declaredMime = file.mimetype ?? "";
      if (!ALLOWED_MIME.has(declaredMime)) {
        return reply
          .status(415)
          .send(errorResponse("Unsupported file type — use PDF / JPEG / PNG / WebP / AVIF"));
      }
      const buffer = await file.toBuffer();
      if (buffer.length > MAX_BYTES) {
        return reply.status(413).send(errorResponse("File too large (max 10MB)"));
      }
      const mimetype = verifySniffedMime(buffer, declaredMime, ALLOWED_MIME);
      if (!mimetype) {
        return reply.status(415).send(errorResponse("File content does not match declared type"));
      }

      // The document name is what the patient sees in their subject line, so
      // unlike the plain upload's optional label it is required here.
      const nameField = file.fields?.["name"];
      const documentName =
        nameField && !Array.isArray(nameField) && "value" in nameField
          ? String(nameField.value ?? "").trim().slice(0, 200)
          : "";
      if (!documentName) {
        return reply.status(400).send(errorResponse("A document name is required"));
      }

      // The Doctor profile name ("Dr. …"), not the login User's — this is what
      // the patient is shown as the sender.
      const doctorProfile = await prisma.doctor.findUnique({
        where: { id: auth.doctorId },
        select: { fullName: true },
      });
      const doctorName = doctorProfile?.fullName ?? auth.fullName;

      const safeName = sanitizeOriginalFilename(file.filename ?? "document");
      const storageKey = `clinical/${auth.doctorId}/${appt.id}/${randomUUID()}-${safeName}`;

      try {
        await putObject(storageKey, buffer, mimetype);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Upload failed"));
      }

      let row: { id: string; label: string; mimetype: string; byteSize: number; createdAt: Date };
      try {
        row = await prisma.appointmentDocument.create({
          data: {
            appointmentId: appt.id,
            doctorId: auth.doctorId,
            label: documentName,
            storageKey,
            mimetype,
            byteSize: buffer.length,
            uploadedByRole: "DOCTOR",
            uploadedByUserId: auth.userId,
          },
          select: { id: true, label: true, mimetype: true, byteSize: true, createdAt: true },
        });
      } catch (error) {
        try {
          await deleteObject(storageKey);
        } catch {
          /* best-effort */
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save document"));
      }

      const result = await sendDoctorDocumentToPatientEmail({
        to: appt.email,
        patientName: appt.fullName,
        documentName,
        doctorName,
        attachment: {
          filename: safeName,
          content: buffer,
          contentType: mimetype,
        },
      });
      // `mode: "log"` means no provider is wired and nothing left the building —
      // treat it as a failure so the doctor is never told a patient received
      // something they did not.
      if (!result.ok || result.mode === "log") {
        await prisma.appointmentDocument.delete({ where: { id: row.id } }).catch(() => {});
        try {
          await deleteObject(storageKey);
        } catch {
          /* best-effort */
        }
        const detail = !result.ok
          ? result.message
          : "Email is not configured — set GMAIL_SEND_FROM + Google OAuth or SENDGRID_API_KEY";
        app.log.error({ appointmentId: appt.id, detail }, "Send-document-to-patient failed");
        return reply.status(502).send(errorResponse(`Could not send the document: ${detail}`));
      }

      // S-008: PHI left the platform — this audit must be loud, but the send
      // already happened, so a failed audit write must not 500 a delivered
      // document. Same reasoning as the upload path above.
      try {
        await recordCriticalAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "DOCUMENT_SENT_TO_PATIENT",
          entityType: "AppointmentDocument",
          entityId: row.id,
          metadata: {
            appointmentId: appt.id,
            documentName,
            byteSize: buffer.length,
          },
          request,
        });
      } catch (auditError) {
        app.log.error(
          { err: auditError, documentId: row.id },
          "CRITICAL: DOCUMENT_SENT_TO_PATIENT audit write failed",
        );
      }
      notifyAdmins("DOCUMENT_UPLOADED", {
        appointmentId: appt.id,
        snippet: `${appt.fullName} · ${documentName} · sent to patient`,
        byUserName: auth.fullName,
        byRole: "DOCTOR",
      }).catch(() => {});

      return reply.status(201).send(
        okResponse(
          {
            document: {
              id: row.id,
              label: row.label,
              mimetype: row.mimetype,
              byteSize: row.byteSize,
              url: buildDownloadPath(row.id),
              uploadedBy: doctorName,
              createdAt: row.createdAt.toISOString(),
            },
            sentTo: appt.email,
          },
          "Document sent to the patient",
        ),
      );
    },
  );

  /**
   * Auth-gated streaming download. The public `/api/media/*` route
   * refuses any `clinical/*` key, so this is the ONLY path that hands
   * out clinical attachments. Doctors can fetch their own files;
   * admins can fetch any (support workflows).
   */
  app.get<{ Params: { documentId: string } }>(
    "/api/doctor/documents/:documentId/download",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      if (!isMediaStorageConfigured()) {
        return reply
          .status(503)
          .send(errorResponse("Object storage is not configured"));
      }
      try {
        const doc = await prisma.appointmentDocument.findUnique({
          where: { id: request.params.documentId },
          select: {
            id: true,
            doctorId: true,
            mimetype: true,
            label: true,
            storageKey: true,
            appointmentId: true,
          },
        });
        if (!doc) {
          return reply.status(404).send(errorResponse("Document not found"));
        }
        // Doctors can only read their own attachments; admins (no
        // doctorId on the session) get a free pass for support
        // workflows.
        if (auth.role === "DOCTOR" && doc.doctorId !== auth.doctorId) {
          return reply.status(403).send(errorResponse("Forbidden"));
        }
        try {
          await guardMedicalReadForAppointment(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            doc.appointmentId,
            { resourceType: "MEDICAL_DOC", accessAction: "DOWNLOADED", resourceId: doc.id },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }
        const obj = await getObject(doc.storageKey);
        const buffer = await readObjectBodyToBuffer(obj.Body);
        if (!buffer) {
          return reply
            .status(500)
            .send(errorResponse("Unable to read document"));
        }

        // Doctors read scans and PDFs far more often than they archive them,
        // so render in the browser rather than forcing a download. The old
        // blanket `attachment` was there because the stored MIME is
        // client-declared — so decide from the actual magic bytes instead of
        // trusting it. Anything that doesn't sniff to a known-safe viewable
        // type (an HTML or SVG payload mislabeled as a PDF, say) still
        // downloads, as octet-stream, and never renders in our origin.
        const sniffed = sniffFileMime(buffer);
        const viewable = sniffed !== null && INLINE_VIEWABLE_MIME.has(sniffed);
        reply.header("Content-Type", viewable ? sniffed : "application/octet-stream");
        reply.header(
          "Content-Disposition",
          contentDisposition(doc.label, viewable ? "inline" : "attachment"),
        );
        // Belt and braces for the inline path: no MIME re-guessing by the
        // browser, and a sandboxed document so even a crafted PDF cannot run
        // script or reach the session that authorised the download.
        reply.header("X-Content-Type-Options", "nosniff");
        reply.header("Content-Security-Policy", "sandbox; default-src 'none'; object-src 'self'");
        reply.header("Cache-Control", "private, no-store");
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- Fastify's typed reply.send() of a binary buffer, not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput). CSP/nosniff headers above are the actual XSS defense for this download.
        return reply.send(buffer);
      } catch (error) {
        if (error instanceof NoSuchKey || error instanceof MediaObjectNotFoundError) {
          return reply.status(404).send(errorResponse("Document not found"));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not stream document"));
      }
    },
  );

  app.delete<{ Params: { documentId: string } }>(
    "/api/doctor/documents/:documentId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const existing = await prisma.appointmentDocument.findUnique({
          where: { id: request.params.documentId },
        });
        if (!existing || existing.doctorId !== auth.doctorId) {
          return reply.status(404).send(errorResponse("Document not found"));
        }
        try {
          await guardMedicalReadForAppointment(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            existing.appointmentId,
            { resourceType: "MEDICAL_DOC", accessAction: "UPDATED" },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }
        await prisma.appointmentDocument.delete({ where: { id: existing.id } });
        try {
          await deleteObject(existing.storageKey);
        } catch (err) {
          // Don't fail the delete on storage cleanup — the DB row is
          // gone, and a stray S3 blob is recoverable by ops if needed.
          app.log.warn({ err }, "Failed to delete object from storage");
        }
        // S-008: PHI document delete — audit write must not be silently
        // swallowed. Safe to throw here: the storage-cleanup step above
        // already ran in its own try/catch (best-effort), so a thrown
        // audit failure only surfaces as a 500 on an already-completed
        // delete, not a spurious cleanup action.
        await recordCriticalAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "DOCUMENT_DELETED",
          entityType: "AppointmentDocument",
          entityId: existing.id,
          request,
        });
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete document"));
      }
    },
  );

  /**
   * Admin counterpart of the doctor upload above: an operator attaches a
   * medical record to an appointment on the patient's behalf (scans handed in
   * at reception, lab PDFs mailed to the clinic, records the patient could not
   * upload themselves).
   *
   * Deliberately writes the SAME `AppointmentDocument` row the doctor upload
   * and the patient upload-link flow write, so the file surfaces everywhere
   * those already do — the doctor's appointment Documents tab ("Uploaded
   * files"), the doctor's patient record, and the patient portal's medical
   * files — with no extra listing plumbing.
   *
   * The row's `doctorId` is the appointment's assigned doctor (the column is
   * required, and it is what the download route authorises against), so an
   * unassigned appointment is rejected rather than guessed at.
   */
  app.post<{ Params: { id: string } }>(
    "/api/admin/appointments/:id/documents",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("Object storage is not configured"));
      }

      const appt = await prisma.appointment.findUnique({
        where: { id: request.params.id },
        select: {
          id: true,
          fullName: true,
          doctorId: true,
          email: true,
          phone: true,
          countryCode: true,
          notificationLocale: true,
          userId: true,
        },
      });
      if (!appt) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      if (!appt.doctorId) {
        return reply
          .status(409)
          .send(errorResponse("Assign a doctor to this appointment before uploading records"));
      }

      const actor = resolveAdminSessionActor(request);
      try {
        await guardMedicalReadForAppointment(
          request,
          { userId: actor?.userId ?? "system", role: actor?.role ?? "ADMIN", doctorId: null },
          appt.id,
          { resourceType: "MEDICAL_DOC", accessAction: "UPLOADED" },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      const file = await request.file();
      if (!file) {
        return reply.status(400).send(errorResponse('Expected one file field named "file"'));
      }
      const declaredMime = file.mimetype ?? "";
      if (!ALLOWED_MIME.has(declaredMime)) {
        return reply
          .status(415)
          .send(errorResponse("Unsupported file type — use PDF / JPEG / PNG / WebP / AVIF"));
      }
      const buffer = await file.toBuffer();
      if (buffer.length > MAX_BYTES) {
        return reply.status(413).send(errorResponse("File too large (max 10MB)"));
      }
      const mimetype = verifySniffedMime(buffer, declaredMime, ALLOWED_MIME);
      if (!mimetype) {
        return reply.status(415).send(errorResponse("File content does not match declared type"));
      }

      const labelField = file.fields?.["label"];
      let label = "";
      if (labelField && !Array.isArray(labelField) && "value" in labelField) {
        label = String(labelField.value ?? "").trim().slice(0, 200);
      }
      const safeName = sanitizeOriginalFilename(file.filename ?? "document");
      if (!label) label = safeName;

      const storageKey = `clinical/${appt.doctorId}/${appt.id}/${randomUUID()}-${safeName}`;

      try {
        await putObject(storageKey, buffer, mimetype);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Upload failed"));
      }

      try {
        const row = await prisma.appointmentDocument.create({
          data: {
            appointmentId: appt.id,
            doctorId: appt.doctorId,
            label,
            storageKey,
            mimetype,
            byteSize: buffer.length,
            uploadedByRole: "ADMIN",
            uploadedByUserId: actor?.userId ?? null,
          },
          select: { id: true, label: true, mimetype: true, byteSize: true, createdAt: true },
        });
        // Same S-008 reasoning as the doctor upload: the file and its row are
        // already committed here, so an audit failure must log loudly rather
        // than throw into the catch below, which deletes the stored object.
        try {
          await recordCriticalAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "ADMIN",
            action: "DOCUMENT_UPLOADED",
            entityType: "AppointmentDocument",
            entityId: row.id,
            metadata: {
              appointmentId: appt.id,
              label,
              byteSize: buffer.length,
              uploadedByAdmin: true,
            },
            request,
          });
        } catch (auditError) {
          app.log.error(
            { err: auditError, documentId: row.id },
            "CRITICAL: DOCUMENT_UPLOADED audit write failed",
          );
        }
        // Tell the patient a new file is waiting — bell, email and WhatsApp,
        // in the language the booking is written in. Fire-and-forget: the
        // record is already on file, so a mail/WhatsApp outage must not fail
        // the upload the operator just made.
        void (async () => {
          try {
            const lang = resolveNotificationLang({
              notificationLocale: appt.notificationLocale,
              countryCode: appt.countryCode,
            });
            const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
            const link = `${base}/account/medical-files`;
            const patientName = appt.fullName ?? appt.email;
            const copy = clinicDocumentCopy(lang);

            // In-app bell. Only for a claimed account — a guest booking has no
            // User row to hang a notification off.
            if (appt.userId) {
              await notifyUser(appt.userId, "DOCUMENT_UPLOADED", {
                appointmentId: appt.id,
                title: copy.emailHeading,
                body: copy.emailBody.replace("{document}", label),
                href: "/account/medical-files",
              }).catch((err) =>
                app.log.warn({ err }, "admin document upload: patient bell failed"),
              );
            }

            await sendClinicDocumentAddedEmail({
              to: appt.email,
              patientName,
              documentName: label,
              link,
              lang,
            }).catch((err) =>
              app.log.warn({ err }, "admin document upload: patient email failed"),
            );

            if (appt.phone) {
              const wa = await sendWhatsAppText({
                to: appt.phone,
                message: clinicDocumentWhatsApp(lang, label, link),
              });
              if (!wa.ok && !wa.skipped) {
                app.log.warn({ wa }, "admin document upload: patient whatsapp failed");
              }
            }
          } catch (err) {
            app.log.warn({ err }, "admin document upload: patient notification threw");
          }
        })();
        return reply.status(201).send(
          okResponse({
            document: {
              id: row.id,
              label: row.label,
              mimetype: row.mimetype,
              byteSize: row.byteSize,
              url: buildDownloadPath(row.id),
              createdAt: row.createdAt.toISOString(),
            },
          }),
        );
      } catch (error) {
        try {
          await deleteObject(storageKey);
        } catch {
          /* best-effort */
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save document"));
      }
    },
  );
};

export default appointmentDocumentsRoute;
