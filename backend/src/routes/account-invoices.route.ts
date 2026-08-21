import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError, normalizeDbError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";
import { isCommissionCountry } from "../modules/orders/commission.service.js";

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
};

export default accountInvoicesRoute;
