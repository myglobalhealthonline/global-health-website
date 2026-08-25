import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError, normalizeDbError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";
import { isCommissionCountry } from "../modules/orders/commission.service.js";
import {
  buildSubscriptionInvoiceDetail,
  buildSubscriptionInvoicePdfData,
} from "../modules/invoices/subscription-invoice-document.service.js";
import { renderInvoicePdfBuffer } from "../modules/invoices/invoice-pdf.js";
import { getObject, streamToNodeReadable } from "../services/object-storage.js";

/**
 * The signed-in patient's own Global Health billing documents — the invoices,
 * receipts and credit notes issued against their consultation/product orders.
 *
 * Distinct from /api/account/payments, which lists the Stripe payment ledger
 * and links to Stripe's own hosted receipt. This lists OUR fiscal document,
 * the one /print/order-invoices/:invoiceId renders and the invoice email
 * attaches. Before this endpoint the portal surfaced membership (Stripe)
 * invoices only, so consultation invoices were reachable solely through the
 * emailed link.
 *
 * OWNERSHIP: matched on the order's userId, and additionally on the order's
 * email so that bookings made as a guest before the account existed (or made
 * by staff on the patient's behalf) still appear. Email is compared
 * case-insensitively — order emails are not normalized on write.
 */
const accountInvoicesRoute: FastifyPluginAsync = async (app) => {
  /**
   * Resolves the caller, or replies and returns null. ADMIN is allowed through
   * alongside PATIENT for support work, matching account-payments.route.ts —
   * but every query below is still scoped to the resolved user's own id, so an
   * admin sees their own rows, never someone else's.
   */
  async function requirePatient(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<SafeUser | null> {
    let authUser: SafeUser | null = null;
    try {
      authUser = await resolveOptionalAuthUser(request);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        reply.status(503).send(errorResponse(error.message));
        return null;
      }
      app.log.error(error);
      reply.status(500).send(errorResponse("Unexpected authentication error"));
      return null;
    }
    if (!authUser) {
      reply.status(401).send(errorResponse("Not authenticated"));
      return null;
    }
    if (authUser.role !== "PATIENT" && authUser.role !== "ADMIN") {
      reply.status(403).send(errorResponse("Forbidden"));
      return null;
    }
    return authUser;
  }

  app.get("/api/account/invoices", async (request, reply) => {
    let authUser: SafeUser | null = null;
    try {
      authUser = await resolveOptionalAuthUser(request);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
    if (!authUser) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    if (authUser.role !== "PATIENT" && authUser.role !== "ADMIN") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          order: {
            OR: [
              { userId: authUser.id },
              { email: { equals: authUser.email, mode: "insensitive" } },
            ],
          },
        },
        orderBy: { generatedAt: "desc" },
        take: 100,
        select: {
          id: true,
          invoiceNumber: true,
          documentType: true,
          creditNoteReason: true,
          countryCode: true,
          generatedAt: true,
          pdfStorageKey: true,
          order: {
            select: {
              orderNumber: true,
              totalCents: true,
              commissionTotalCents: true,
              currencyCode: true,
              paymentStatus: true,
              items: { select: { name: true }, take: 3 },
            },
          },
        },
      });

      // An order commonly carries BOTH an INVOICE row and a RECEIPT row under
      // the SAME invoiceNumber — the demand for payment and the proof of it.
      // Admin wants to see every document; a patient seeing "IE-00272" twice
      // just reads as a duplicate, so collapse to the most settled one per
      // number. CREDIT_NOTEs carry their own number and are never collapsed
      // away — a refund the patient can't see would be worse than a duplicate.
      const RANK: Record<string, number> = {
        INVOICE: 0,
        RECEIPT: 1,
        INVOICE_RECEIPT: 2,
        CREDIT_NOTE: 3,
      };
      const bestByNumber = new Map<string, (typeof invoices)[number]>();
      for (const row of invoices) {
        const key = `${row.invoiceNumber}::${row.documentType === "CREDIT_NOTE" ? row.id : ""}`;
        const held = bestByNumber.get(key);
        if (!held || (RANK[row.documentType] ?? 0) > (RANK[held.documentType] ?? 0)) {
          bestByNumber.set(key, row);
        }
      }
      const deduped = [...bestByNumber.values()].sort(
        (x, y) => y.generatedAt.getTime() - x.generatedAt.getTime(),
      );

      // Commission markets: the document we issue is FOR the commission, not
      // the amount charged. Same rule as the print page and
      // buildInvoicePdfData (snapshot present AND the country is actually a
      // commission market), so the portal never shows a total the document
      // itself contradicts. Resolved once per distinct country rather than
      // per row.
      const countries = [...new Set(deduped.map((i) => i.countryCode))];
      const commissionByCountry = new Map(
        await Promise.all(
          countries.map(async (code) => [code, await isCommissionCountry(code)] as const),
        ),
      );

      const items = deduped.map((i) => {
        const commissionMode =
          i.order.commissionTotalCents != null &&
          commissionByCountry.get(i.countryCode) === true;
        return {
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          documentType: i.documentType,
          creditNoteReason: i.creditNoteReason,
          countryCode: i.countryCode,
          generatedAt: i.generatedAt.toISOString(),
          orderNumber: i.order.orderNumber,
          totalCents: commissionMode
            ? (i.order.commissionTotalCents as number)
            : i.order.totalCents,
          currencyCode: i.order.currencyCode,
          paymentStatus: i.order.paymentStatus,
          description: i.order.items.map((item) => item.name).join(", ") || null,
          // Portugal: the document is InvoiceExpress's, mirrored into storage,
          // so the portal must offer the stored PDF instead of the print page —
          // there is no order data here from which to draw one.
          hasStoredPdf: Boolean(i.pdfStorageKey),
        };
      });

      return okResponse({ items, total: items.length });
    } catch (error) {
      const normalized = normalizeDbError(error, "Could not load invoices");
      if (normalized instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(normalized.message));
      }
      app.log.error(normalized);
      return reply.status(500).send(errorResponse("Could not load invoices"));
    }
  });

  /**
   * The Portuguese Fatura-Recibo as a PDF.
   *
   * Every other market's document is DRAWN on demand by
   * /print/order-invoices/:invoiceId from the order's data. Portugal's is
   * issued by InvoiceExpress, so there is nothing to draw — this streams the
   * copy we stored when it was issued (see pt-invoice-mirror.service.ts). Our
   * copy, deliberately, not a live InvoiceExpress link: the signed URLs expire
   * and the document must outlive the third-party account.
   *
   * Scoped exactly like the listing above — the caller's own orders, matched on
   * userId OR the order email, so guest-era bookings still resolve.
   */
  app.get<{ Params: { invoiceId: string } }>(
    "/api/account/invoices/:invoiceId/pdf",
    async (request, reply) => {
      const auth = await requirePatient(request, reply);
      if (!auth) return;

      try {
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: request.params.invoiceId,
            order: {
              OR: [
                { userId: auth.id },
                { email: { equals: auth.email, mode: "insensitive" } },
              ],
            },
          },
          select: { invoiceNumber: true, pdfStorageKey: true, invoiceExpressPermalink: true },
        });
        // Same 404 for "not yours" as for "does not exist" — an ownership probe
        // must not be distinguishable from a missing document.
        if (!invoice) return reply.status(404).send(errorResponse("Invoice not found"));

        if (!invoice.pdfStorageKey) {
          // The document exists in InvoiceExpress but the mirror has not landed
          // (or this is a non-PT row, which renders through the print page).
          return reply.status(404).send(errorResponse("Invoice PDF is not available yet"));
        }

        const obj = await getObject(invoice.pdfStorageKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("Invoice PDF is not available"));

        // Slashes are legal in an InvoiceExpress sequence number
        // ("202/Globalhealth") and illegal in a filename.
        const fileName = `${invoice.invoiceNumber.replace(/[/\\]/g, "-")}.pdf`;
        void reply.header("Content-Type", obj.ContentType ?? "application/pdf");
        void reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
        void reply.header("Cache-Control", "private, no-store");
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming a stored PDF's Node Readable through Fastify's typed reply.send(), not writing user-controlled HTML.
        return reply.send(stream);
      } catch (error) {
        const normalized = normalizeDbError(error, "Could not load invoice PDF");
        if (normalized instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(normalized.message));
        }
        app.log.error(normalized);
        return reply.status(500).send(errorResponse("Could not load invoice PDF"));
      }
    },
  );

  /**
   * One membership charge, drawn as a Global Health document rather than
   * Stripe's. Shaped identically to the order invoice payload so the printable
   * page renders both through one component. Scoped to the caller's own
   * subscription — unlike the order document, this is not link-shareable,
   * because nothing of ours ever emails it.
   */
  app.get<{ Params: { id: string } }>(
    "/api/account/subscription-invoices/:id",
    async (request, reply) => {
      const auth = await requirePatient(request, reply);
      if (!auth) return;

      try {
        const payload = await buildSubscriptionInvoiceDetail(request.params.id, auth.id);
        if (!payload) {
          return reply.status(404).send(errorResponse("Invoice not found"));
        }
        const { patientProfileId: _omit, ...body } = payload;
        return okResponse(body);
      } catch (error) {
        const normalized = normalizeDbError(error, "Could not load invoice");
        if (normalized instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(normalized.message));
        }
        app.log.error(normalized);
        return reply.status(500).send(errorResponse("Could not load invoice"));
      }
    },
  );

  /** The same membership document as a downloadable PDF. */
  app.get<{ Params: { id: string } }>(
    "/api/account/subscription-invoices/:id/pdf",
    { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const auth = await requirePatient(request, reply);
      if (!auth) return;

      try {
        const built = await buildSubscriptionInvoicePdfData(request.params.id, auth.id);
        if (!built) return reply.status(404).send(errorResponse("Invoice not found"));

        const pdfBuffer = await renderInvoicePdfBuffer(built.data);
        if (!pdfBuffer) {
          return reply.status(500).send(errorResponse("Could not render document PDF"));
        }
        return reply
          .header("Content-Type", "application/pdf")
          .header("Content-Disposition", `attachment; filename="${built.filename}"`)
          .send(pdfBuffer);
      } catch (error) {
        const normalized = normalizeDbError(error, "Could not generate document PDF");
        if (normalized instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(normalized.message));
        }
        app.log.error(normalized);
        return reply.status(500).send(errorResponse("Could not generate document PDF"));
      }
    },
  );
};

export default accountInvoicesRoute;
