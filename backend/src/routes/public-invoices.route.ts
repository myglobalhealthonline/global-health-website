import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { buildInvoiceDetailPayload } from "../modules/invoices/invoice-detail.service.js";
import { buildInvoicePdfData, renderInvoicePdfBuffer } from "../modules/invoices/invoice-pdf.js";

/**
 * Public read of one billing document, for the printable page at
 * /print/order-invoices/:invoiceId.
 *
 * WHY THIS IS UNAUTHENTICATED
 * ---------------------------
 * That URL is what generate-invoice.service.ts emails and WhatsApps to the
 * patient. It used to be served from /api/admin/invoices/:invoiceId, which is
 * admin-only — so every patient who clicked their own invoice link was bounced
 * to /account, and every doctor got a hard 404. Anyone holding the link is,
 * by design, meant to be able to read the document it points at.
 *
 * ENUMERATION RISK — READ BEFORE COPYING THIS PATTERN
 * --------------------------------------------------
 * `Invoice.id` is a Prisma cuid(): a millisecond timestamp, a monotonic
 * counter, a host fingerprint and only four random characters. It is NOT a
 * capability token, so this endpoint is walkable by anyone willing to iterate
 * ids, and each hit returns a patient's name, email, phone and taxpayer id.
 * The rate limit below raises the cost of that walk; it does not prevent it.
 * The durable fix is a random per-invoice `publicToken` keyed into the URL —
 * intentionally deferred so that already-delivered links keep working.
 *
 * Deliberately narrower than the admin route: no MedicalAccessLog row is
 * written (an anonymous read has no actor to attribute) and no clinical
 * content is exposed — this is a billing document, not a consultation record.
 */
const paramsSchema = z.object({ invoiceId: z.string().trim().min(1).max(120) });

const publicInvoicesRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { invoiceId: string } }>(
    "/api/public/invoices/:invoiceId",
    { config: { rateLimit: { max: 60, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid invoice id"));
      }

      try {
        // No nosemgrep needed: gh-phi-route-missing-guard matches prisma
        // find* calls INSIDE a FastifyPluginAsync, and every read for this
        // document happens in invoice-detail.service.ts. Do not inline a
        // prisma call here — it would trip that rule, correctly.
        const payload = await buildInvoiceDetailPayload(params.data.invoiceId);
        if (!payload) {
          return reply.status(404).send(errorResponse("Invoice not found"));
        }

        // patientProfileId exists only so the admin route can log its PHI read.
        const { patientProfileId: _omit, ...body } = payload;
        return okResponse(body);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load invoice"));
      }
    },
  );

  /**
   * Same document as the page above, rendered as the real PDF — the "Download"
   * action on the printable page. Public for the same reason and with the same
   * enumeration caveat; the only fields it exposes are the ones already
   * printed on the document itself.
   *
   * Rendering a PDF costs far more than a JSON read, so this carries a tighter
   * limit than the detail endpoint.
   */
  app.get<{ Params: { invoiceId: string } }>(
    "/api/public/invoices/:invoiceId/pdf",
    { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid invoice id"));
      }

      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: params.data.invoiceId },
          select: {
            invoiceNumber: true,
            documentType: true,
            creditNoteReason: true,
            generatedAt: true,
            orderId: true,
          },
        });
        if (!invoice) return reply.status(404).send(errorResponse("Invoice not found"));

        const pdfData = await buildInvoicePdfData(
          invoice.orderId,
          invoice.invoiceNumber,
          invoice.generatedAt.toISOString(),
          invoice.documentType,
          invoice.creditNoteReason,
        );
        const pdfBuffer = pdfData ? await renderInvoicePdfBuffer(pdfData) : null;
        if (!pdfBuffer) {
          return reply.status(500).send(errorResponse("Could not render document PDF"));
        }

        const prefix =
          invoice.documentType === "CREDIT_NOTE"
            ? "credit-note"
            : invoice.documentType === "RECEIPT"
              ? "receipt"
              : "invoice";
        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `attachment; filename="${prefix}-${invoice.invoiceNumber}.pdf"`,
          )
          .send(pdfBuffer);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not generate document PDF"));
      }
    },
  );
};

export default publicInvoicesRoute;
