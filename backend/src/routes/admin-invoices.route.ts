import type { FastifyPluginAsync } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import {
  assertOrderCountryScope,
  resolveOrderListCountryScope,
} from "../utils/order-country-scope.js";
import { guardMedicalRead, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOrderPaymentUrl } from "../modules/orders/order-payment-url.service.js";
import { buildInvoicePdfData, renderInvoicePdfBuffer } from "../modules/invoices/invoice-pdf.js";
import { resendInvoiceDocument, resendInvoiceWhatsApp } from "../modules/invoices/generate-invoice.service.js";
import { buildInvoiceDetailPayload } from "../modules/invoices/invoice-detail.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { getObject, streamToNodeReadable } from "../services/object-storage.js";

/**
 * Admin invoice endpoints.
 *
 *   GET  /api/admin/invoices              → paginated list, most-recent first
 *   GET  /api/admin/invoices/:invoiceId   → full invoice payload for print page
 *   GET  /api/admin/orders/:id/payment-link → resolve/refresh Stripe checkout URL
 */

const idParamSchema = z.object({ invoiceId: z.string().min(1).max(120) });
const orderIdParamSchema = z.object({ id: z.string().min(1).max(120) });

/** Consultation / item kinds an admin can filter invoices by. */
const CART_ITEM_KINDS = [
  "HEALTH_TEST",
  "PRESCRIPTION_SERVICE",
  "GENERAL_CONSULTATION",
  "SPECIALIST_CONSULTATION",
] as const;

/** Fiscal document types — must mirror the Prisma `InvoiceDocumentType` enum. */
const INVOICE_DOCUMENT_TYPES = ["INVOICE", "RECEIPT", "INVOICE_RECEIPT", "CREDIT_NOTE"] as const;

/** Treat blank form fields (`?q=&kind=`) as absent rather than a validation error. */
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);

/** `YYYY-MM`, e.g. `2026-07`. */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Upper bound on the number of distinct orders the stats aggregate will sum.
 * Beyond this the totals are reported as truncated rather than issuing an
 * unbounded `IN (...)`, which would degrade badly once the invoice table grows.
 */
const STATS_ORDER_CAP = 5000;

const listQuerySchema = z.object({
  cursor: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /**
   * Free-text search — matched (case-insensitive, substring) against invoice
   * number, order number, patient name, email, phone, and fiscal / tax number
   * (NIF, on the patient profile). Only guaranteed-present Order/Invoice/
   * PatientProfile columns are searched — the OrderItem intake snapshots are
   * NOT, since they are drift-prone on the live DB and 500 the whole search
   * when a column is missing.
   */
  q: z.preprocess(blankToUndefined, z.string().trim().min(1).max(160).optional()),
  /** Consultation / item type filter. */
  kind: z.preprocess(blankToUndefined, z.enum(CART_ITEM_KINDS).optional()),
  /** Document-type filter: unpaid invoices, receipts, or combined invoice/receipts. */
  documentType: z.preprocess(blankToUndefined, z.enum(INVOICE_DOCUMENT_TYPES).optional()),
  /** Invoice-date (generatedAt) range, inclusive. */
  invoiceFrom: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  invoiceTo: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  /** Consultation-date (appointment.scheduledAt) range, inclusive. */
  consultFrom: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  consultTo: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  /**
   * Country scope, e.g. `ie`. Matched case-insensitively against
   * `Invoice.countryCode`, which is indexed as [countryCode, generatedAt desc].
   */
  countryCode: z.preprocess(blankToUndefined, z.string().trim().min(2).max(8).optional()),
  /**
   * Calendar-month shortcut on the invoice date, `YYYY-MM`. ANDed with
   * invoiceFrom/invoiceTo like every other clause — it narrows, never widens.
   */
  month: z.preprocess(blankToUndefined, z.string().regex(MONTH_RE).optional()),
});

/** Push start/end of the given day so a plain `YYYY-MM-DD` covers the whole day. */
function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * `YYYY-MM` → half-open UTC range [first instant of the month, first instant of
 * the next month). UTC because `generatedAt` is stored in UTC; a month boundary
 * is therefore reckoned in UTC, not in the admin's local zone.
 */
function monthRangeUtc(month: string): { gte: Date; lt: Date } {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  return {
    gte: new Date(Date.UTC(year, mon - 1, 1)),
    lt: new Date(Date.UTC(mon === 12 ? year + 1 : year, mon === 12 ? 0 : mon, 1)),
  };
}

export type AdminInvoiceStats = {
  /** Distinct orders across the whole filtered set. */
  orderCount: number;
  /** Fiscal documents across the whole filtered set. */
  documentCount: number;
  /** Of those documents, how many have been emailed. */
  emailSentCount: number;
  /** Order value per currency — a multi-country scope can mix currencies. */
  totals: { currencyCode: string; totalCents: number }[];
  /** True when the order set exceeded STATS_ORDER_CAP and `totals` is partial. */
  truncated: boolean;
};

/**
 * Aggregate the summary numbers over every invoice matching the filters.
 *
 * `groupBy` (real SQL GROUP BY) rather than `findMany({ distinct })`, which
 * Prisma applies in memory after fetching every row.
 */
async function buildInvoiceStats(
  and: Prisma.InvoiceWhereInput[],
  where: Prisma.InvoiceWhereInput,
): Promise<AdminInvoiceStats> {
  const [documentCount, emailSentCount, orderGroups] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.count({ where: { AND: [...and, { emailSentAt: { not: null } }] } }),
    // orderBy is mandatory alongside `take` on groupBy; the order is irrelevant
    // here since we only ever count the rows and sum their orders.
    prisma.invoice.groupBy({
      by: ["orderId"],
      where,
      orderBy: { orderId: "asc" },
      take: STATS_ORDER_CAP + 1,
    }),
  ]);

  const truncated = orderGroups.length > STATS_ORDER_CAP;
  const orderIds = orderGroups.slice(0, STATS_ORDER_CAP).map((g) => g.orderId);

  // One order carries one total, however many documents hang off it — so sum
  // Order.totalCents over the distinct orders, never over the invoice rows.
  const valueRows = orderIds.length
    ? await prisma.order.groupBy({
        by: ["currencyCode"],
        where: { id: { in: orderIds } },
        _sum: { totalCents: true },
      })
    : [];

  return {
    // When truncated this is a floor ("at least STATS_ORDER_CAP"), not an exact count.
    orderCount: orderIds.length,
    documentCount,
    emailSentCount,
    totals: valueRows
      .map((r) => ({ currencyCode: r.currencyCode, totalCents: r._sum.totalCents ?? 0 }))
      .sort((a, b) => b.totalCents - a.totalCents),
    truncated,
  };
}

const adminInvoicesRoute: FastifyPluginAsync = async (app) => {
  // ── List all invoices ──────────────────────────────────────────────────────
  app.get("/api/admin/invoices", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }
    const {
      cursor,
      limit,
      q,
      kind,
      documentType,
      invoiceFrom,
      invoiceTo,
      consultFrom,
      consultTo,
      countryCode,
      month,
    } = query.data;

    // SEC-001b: LOCAL_ADMIN sees only their assigned countries' invoices.
    // null = unscoped (ADMIN/SUPER_ADMIN/token); [] = a LOCAL_ADMIN with no
    // folders sees nothing (fail closed). Invoice.countryCode is stored
    // lowercase (same convention as Order.countryCode); folders are lowercased.
    const scopedFolders = await resolveOrderListCountryScope(request);

    // Build the filter. Every clause is ANDed; the free-text `q` is an OR across
    // the searchable columns on the invoice, its order, and its line items.
    const and: Prisma.InvoiceWhereInput[] = [];

    if (q) {
      const contains = { contains: q, mode: "insensitive" as const };

      // Fiscal / tax number (NIF) lives on PatientProfile, keyed by email — no
      // relation to Order/Invoice. Resolve matching profile emails first, then
      // fold them into the OR as case-insensitive order-email matches.
      //
      // S-031: this is a fan-out search across every patient's tax ID, not a
      // single-resource read, so guardMedicalRead (designed for one patient
      // at a time) doesn't fit — per-match guarding would be slow and is the
      // wrong tool. Instead, log the search itself as one audit event: who
      // searched, and that a match attempt happened, never the raw search
      // term (only its length) or which patients matched.
      let taxEmails: string[] = [];
      try {
        const taxMatches = await prisma.patientProfile.findMany({
          where: { taxIdNumber: contains },
          select: { email: true },
          take: 200,
        });
        taxEmails = taxMatches.map((p) => p.email);
        const actor = resolveAdminSessionActor(request);
        // Fire-and-forget: a missing audit row must never fail the search.
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "PATIENT_TAX_ID_SEARCHED",
          entityType: "PatientProfile",
          entityId: "*",
          metadata: { searchTermLength: q.length, matchCount: taxEmails.length },
          request,
        });
      } catch (err) {
        // Non-fatal: fiscal-number matching is best-effort, never break search.
        app.log.warn({ err }, "invoice search: tax-id lookup failed");
      }

      and.push({
        OR: [
          { invoiceNumber: contains },
          { order: { orderNumber: contains } },
          { order: { fullName: contains } },
          { order: { email: contains } },
          { order: { phone: contains } },
          ...taxEmails.map((email) => ({
            order: { email: { equals: email, mode: "insensitive" as const } },
          })),
        ],
      });
    }

    if (kind) {
      and.push({ order: { items: { some: { kind } } } });
    }

    if (documentType) {
      and.push({ documentType });
    }

    if (countryCode) {
      and.push({ countryCode: { equals: countryCode, mode: "insensitive" } });
    }

    if (month) {
      and.push({ generatedAt: monthRangeUtc(month) });
    }

    if (invoiceFrom || invoiceTo) {
      and.push({
        generatedAt: {
          ...(invoiceFrom ? { gte: invoiceFrom } : {}),
          ...(invoiceTo ? { lte: endOfDay(invoiceTo) } : {}),
        },
      });
    }

    if (consultFrom || consultTo) {
      and.push({
        order: {
          orderAppointments: {
            some: {
              appointment: {
                scheduledAt: {
                  ...(consultFrom ? { gte: consultFrom } : {}),
                  ...(consultTo ? { lte: endOfDay(consultTo) } : {}),
                },
              },
            },
          },
        },
      });
    }

    if (scopedFolders) {
      and.push({ countryCode: { in: scopedFolders } });
    }

    const where: Prisma.InvoiceWhereInput = and.length ? { AND: and } : {};

    try {
      // The list is grouped BY ORDER: each row on the admin page is one order,
      // and opening it reveals every fiscal document linked to that order
      // (invoice, invoice/receipt, receipt, credit note). We paginate over the
      // invoices that match the filters (most-recent first), collapse them to
      // the distinct orders in first-seen order, then hydrate each of those
      // orders with ALL of its documents — so a filter narrows WHICH orders
      // appear, but an opened order always shows its complete document set.
      const pageInvoices = await prisma.invoice.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, orderId: true },
      });

      const hasMore = pageInvoices.length > limit;
      const page = hasMore ? pageInvoices.slice(0, limit) : pageInvoices;
      const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

      // Stats span the WHOLE filtered set, not the cursor page — the numbers
      // answer "how much did <country> bill in <month>", so they must not move
      // when the admin pages forward.
      const stats = await buildInvoiceStats(and, where);

      // Distinct order ids in most-recent-invoice order.
      const orderIds: string[] = [];
      const seen = new Set<string>();
      for (const inv of page) {
        if (!seen.has(inv.orderId)) {
          seen.add(inv.orderId);
          orderIds.push(inv.orderId);
        }
      }

      // Hydrate every document for those orders (not just the filter-matching
      // ones) so an opened order shows its full document set.
      const allDocs = orderIds.length
        ? await prisma.invoice.findMany({
            where: { orderId: { in: orderIds } },
            orderBy: { generatedAt: "desc" },
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  fullName: true,
                  email: true,
                  totalCents: true,
                  currencyCode: true,
                  paymentStatus: true,
                },
              },
            },
          })
        : [];

      const toDocument = (inv: (typeof allDocs)[number]) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        countryCode: inv.countryCode,
        documentType: inv.documentType,
        generatedAt: inv.generatedAt.toISOString(),
        emailSentAt: inv.emailSentAt?.toISOString() ?? null,
        emailSentTo: inv.emailSentTo,
        orderId: inv.orderId,
        orderNumber: inv.order.orderNumber,
        fullName: inv.order.fullName,
        email: inv.order.email,
        totalCents: inv.order.totalCents,
        currencyCode: inv.order.currencyCode,
        paymentStatus: inv.order.paymentStatus,
        // Portugal: InvoiceExpress's document, mirrored here. The print page has
        // no order data to draw it from, so the table must link the stored PDF.
        hasStoredPdf: Boolean(inv.pdfStorageKey),
        invoiceExpressPermalink: inv.invoiceExpressPermalink,
      });

      const docsByOrder = new Map<string, ReturnType<typeof toDocument>[]>();
      for (const inv of allDocs) {
        const list = docsByOrder.get(inv.orderId);
        if (list) list.push(toDocument(inv));
        else docsByOrder.set(inv.orderId, [toDocument(inv)]);
      }

      const orders = orderIds
        .map((id) => {
          const documents = docsByOrder.get(id) ?? [];
          const head = documents[0];
          if (!head) return null;
          return {
            orderId: id,
            orderNumber: head.orderNumber,
            fullName: head.fullName,
            email: head.email,
            countryCode: head.countryCode,
            totalCents: head.totalCents,
            currencyCode: head.currencyCode,
            paymentStatus: head.paymentStatus,
            documents,
          };
        })
        .filter((o): o is NonNullable<typeof o> => o !== null);

      return okResponse({ orders, nextCursor, stats });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load invoices"));
    }
  });

  // ── Invoice detail for print page ──────────────────────────────────────────
  // The document shaping lives in buildInvoiceDetailPayload so this route and
  // the public /api/public/invoices/:invoiceId route can never render different
  // documents for the same invoice. What stays here is the part that is
  // admin-only: LOCAL_ADMIN country scope and the S-031 PHI read guard.
  app.get<{ Params: { invoiceId: string } }>(
    "/api/admin/invoices/:invoiceId",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const payload = await buildInvoiceDetailPayload(params.data.invoiceId);
        if (!payload) {
          return reply.status(404).send(errorResponse("Invoice not found"));
        }

        // SEC-001b: a LOCAL_ADMIN may only open invoices in their countries.
        const scope = await assertOrderCountryScope(
          request,
          payload.order.id,
          payload.invoice.countryCode,
        );
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        // S-031 fix: guard this PHI read. Reason resolution (x-phi-reason /
        // gh_phi_reason) is automatic inside the guard — no per-route
        // threading needed. No profile (guest order) → nothing to guard.
        if (payload.patientProfileId) {
          const actor = resolveAdminSessionActor(request);
          try {
            await guardMedicalRead(
              request,
              { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
              {
                patientProfileId: payload.patientProfileId,
                resourceType: "SENSITIVE_PROFILE",
                accessAction: "VIEWED",
              },
            );
          } catch (guardError) {
            if (guardError instanceof MedicalAccessDeniedError) {
              return reply.status(403).send(medicalAccessDeniedResponse(guardError));
            }
            throw guardError;
          }
        }

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

  // ── Download the document PDF ──────────────────────────────────────────────
  app.get<{ Params: { invoiceId: string } }>(
    "/api/admin/invoices/:invoiceId/pdf",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: params.data.invoiceId },
          select: {
            invoiceNumber: true,
            documentType: true,
            creditNoteReason: true,
            generatedAt: true,
            orderId: true,
            countryCode: true,
            pdfStorageKey: true,
          },
        });
        if (!invoice) return reply.status(404).send(errorResponse("Invoice not found"));

        // SEC-001b: LOCAL_ADMIN may only download in-scope invoices.
        const scope = await assertOrderCountryScope(request, invoice.orderId, invoice.countryCode);
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        // Portugal: the document was issued by InvoiceExpress and mirrored into
        // storage (pt-invoice-mirror.service.ts). Stream that copy — rendering
        // our own template here would hand the admin a second, unofficial
        // version of a legal document that InvoiceExpress alone numbers.
        if (invoice.pdfStorageKey) {
          const obj = await getObject(invoice.pdfStorageKey);
          const stream = streamToNodeReadable(obj.Body);
          if (!stream) return reply.status(404).send(errorResponse("Invoice PDF is not available"));
          // "202/Globalhealth" is a legal sequence number and an illegal filename.
          const fileName = `${invoice.invoiceNumber.replace(/[/\\]/g, "-")}.pdf`;
          void reply.header("Content-Type", obj.ContentType ?? "application/pdf");
          void reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
          void reply.header("Cache-Control", "private, no-store");
          // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming a stored PDF's Node Readable through Fastify's typed reply.send(), not writing user-controlled HTML.
          return reply.send(stream);
        }

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

  // ── Resend the document email to the patient ───────────────────────────────
  app.post<{ Params: { invoiceId: string } }>(
    "/api/admin/invoices/:invoiceId/resend",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      // SEC-001b: LOCAL_ADMIN may only resend in-scope invoices — resolve the
      // owning country before any send happens.
      const invoiceScope = await prisma.invoice.findUnique({
        where: { id: params.data.invoiceId },
        select: { orderId: true, countryCode: true },
      });
      if (!invoiceScope) return reply.status(404).send(errorResponse("Invoice not found"));
      const scope = await assertOrderCountryScope(
        request,
        invoiceScope.orderId,
        invoiceScope.countryCode,
      );
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }

      const channel =
        (request.body as { channel?: string } | null)?.channel === "whatsapp"
          ? "whatsapp"
          : "email";

      try {
        const routeLog = {
          info: (obj: unknown, msg?: string) => app.log.info(obj as object, msg),
          warn: (obj: unknown, msg?: string) => app.log.warn(obj as object, msg),
          error: (obj: unknown, msg?: string) => app.log.error(obj as object, msg),
        };
        if (channel === "whatsapp") {
          const result = await resendInvoiceWhatsApp(params.data.invoiceId, routeLog);
          if (!result.ok) {
            const status = result.reason === "not_found" ? 404 : result.reason === "send_failed" ? 502 : 409;
            return reply.status(status).send(errorResponse(result.message));
          }
          return okResponse({ resent: true, channel });
        }
        const sent = await resendInvoiceDocument(params.data.invoiceId, routeLog);
        if (!sent) return reply.status(404).send(errorResponse("Invoice not found"));
        return okResponse({ resent: true, channel });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not resend document email"));
      }
    },
  );

  // ── Resolve/refresh Stripe payment link for an order ──────────────────────
  app.get<{ Params: { id: string } }>(
    "/api/admin/orders/:id/payment-link",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        // SEC-001b: LOCAL_ADMIN may only resolve payment links for in-scope orders.
        const order = await prisma.order.findUnique({
          where: { id: params.data.id },
          select: { countryCode: true },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));
        const scope = await assertOrderCountryScope(request, params.data.id, order.countryCode);
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        const url = await resolveOrderPaymentUrl(params.data.id);
        if (url) {
          await prisma.order.update({
            where: { id: params.data.id },
            data: { stripeCheckoutUrl: url },
          });
        }
        return okResponse({ url: url || null });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not resolve payment link"));
      }
    },
  );
};

export default adminInvoicesRoute;
