import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import {
  getObject,
  isMediaStorageConfigured,
  streamToNodeReadable,
} from "../services/object-storage.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  listAllPayoutInvoices,
  listDoctorPayoutInvoices,
  parsePayoutInvoiceKey,
} from "../modules/reports/payout-invoice-storage.js";

/**
 * Admin view of doctor-uploaded payout invoices.
 *
 *   GET /api/admin/payout-invoices           — list all (optionally ?doctorId=)
 *   GET /api/admin/payout-invoices/download  — stream any file (?key=)
 *
 * Admin reviews what each doctor uploaded (against the payout statement they
 * generated) and processes the payment off-platform. Read-only — the doctor
 * owns the upload.
 */

const listQuery = z.object({ doctorId: z.string().trim().min(1).max(40).optional() });
const downloadQuery = z.object({ key: z.string().min(1).max(400) });

const adminPayoutInvoicesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/payout-invoices", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }
    const parsed = listQuery.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid query"));

    try {
      const items = parsed.data.doctorId
        ? await listDoctorPayoutInvoices(parsed.data.doctorId)
        : await listAllPayoutInvoices();

      // Resolve doctor names in one query so the admin table reads clearly.
      const doctorIds = Array.from(new Set(items.map((i) => i.doctorId)));
      const doctors = doctorIds.length
        ? await prisma.doctor.findMany({
            where: { id: { in: doctorIds } },
            select: { id: true, fullName: true },
          })
        : [];
      const nameById = new Map(doctors.map((d) => [d.id, d.fullName]));

      return reply.send(
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- Fastify's typed reply.send() of a plain JSON object via okResponse(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
        okResponse({
          items: items.map((i) => ({
            ...i,
            doctorName: nameById.get(i.doctorId) ?? "Unknown doctor",
          })),
        }),
      );
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not list invoices"));
    }
  });

  app.get("/api/admin/payout-invoices/download", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const parsed = downloadQuery.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid key"));
    const meta = parsePayoutInvoiceKey(parsed.data.key);
    if (!meta) return reply.status(404).send(errorResponse("File not found"));
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
};

export default adminPayoutInvoicesRoute;
