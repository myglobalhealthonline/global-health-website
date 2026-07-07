import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  getObject,
  isMediaStorageConfigured,
  putObject,
  streamToNodeReadable,
} from "../services/object-storage.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  buildPayoutInvoiceKey,
  isValidPeriod,
  listDoctorPayoutInvoices,
  parsePayoutInvoiceKey,
  PAYOUT_INVOICE_ALLOWED_MIME,
  PAYOUT_INVOICE_MAX_BYTES,
} from "../modules/reports/payout-invoice-storage.js";

/**
 * Doctor self-serve payout-invoice slot.
 *
 *   POST   /api/doctor/payout-invoices           — upload (multipart: file, period)
 *   GET    /api/doctor/payout-invoices           — list own uploads
 *   GET    /api/doctor/payout-invoices/download  — stream one own file (?key=)
 *
 * The doctor downloads the monthly payout statement (see
 * /api/doctor/reports/export?dataset=payout), generates their invoice, and
 * uploads it here for admin to process. Files are stored under a
 * doctor-scoped S3 prefix — no DB row — and access is scoped by that prefix.
 */

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const downloadQuery = z.object({ key: z.string().min(1).max(400) });

const doctorPayoutInvoicesRoute: FastifyPluginAsync = async (app) => {
  // ── List own uploads ───────────────────────────────────────────────────────
  app.get("/api/doctor/payout-invoices", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }
    try {
      const items = await listDoctorPayoutInvoices(auth.doctorId);
      return reply.send(okResponse({ items }));
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not list invoices"));
    }
  });

  // ── Download one own file ──────────────────────────────────────────────────
  app.get("/api/doctor/payout-invoices/download", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const parsed = downloadQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid key"));
    }
    const meta = parsePayoutInvoiceKey(parsed.data.key);
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
        .send(stream);
    } catch (error) {
      app.log.error(error);
      return reply.status(404).send(errorResponse("File not found"));
    }
  });

  // ── Upload ─────────────────────────────────────────────────────────────────
  app.post("/api/doctor/payout-invoices", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send(errorResponse('Expected one file field named "file"'));
    }
    // `period` (YYYY-MM) arrives as a multipart field alongside the file.
    const periodField = (file.fields as Record<string, unknown> | undefined)?.period;
    const periodValue =
      periodField && typeof periodField === "object" && "value" in periodField
        ? String((periodField as { value: unknown }).value)
        : "";
    if (!isValidPeriod(periodValue)) {
      return reply
        .status(400)
        .send(errorResponse("A valid billing period (YYYY-MM) is required"));
    }

    const declaredMime = file.mimetype ?? "";
    if (!PAYOUT_INVOICE_ALLOWED_MIME.has(declaredMime)) {
      return reply
        .status(415)
        .send(errorResponse("Unsupported file type — upload a PDF or image"));
    }
    const buffer = await file.toBuffer();
    if (buffer.length > PAYOUT_INVOICE_MAX_BYTES) {
      return reply.status(413).send(errorResponse("File too large (max 10MB)"));
    }
    const mimetype = verifySniffedMime(buffer, declaredMime, PAYOUT_INVOICE_ALLOWED_MIME);
    if (!mimetype) {
      return reply
        .status(400)
        .send(errorResponse("File content does not match an allowed type"));
    }

    const originalName = file.filename ?? `invoice.${EXT_BY_MIME[mimetype] ?? "pdf"}`;
    const key = buildPayoutInvoiceKey(auth.doctorId, periodValue, originalName);
    try {
      await putObject(key, buffer, mimetype);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }

    try {
      await recordAudit({
        action: "DOCUMENT_UPLOADED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        actorUserId: auth.userId,
        metadata: { kind: "payout-invoice", period: periodValue, key },
      });
    } catch {
      // Audit is best-effort — the upload already succeeded.
    }

    return reply.send(
      okResponse({
        item: {
          key,
          doctorId: auth.doctorId,
          period: periodValue,
          filename: originalName,
          size: buffer.length,
          uploadedAt: null,
        },
      }),
    );
  });
};

export default doctorPayoutInvoicesRoute;
