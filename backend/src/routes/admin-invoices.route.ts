import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOrderPaymentUrl } from "../modules/orders/order-payment-url.service.js";

/**
 * Admin invoice endpoints.
 *
 *   GET  /api/admin/invoices              → paginated list, most-recent first
 *   GET  /api/admin/invoices/:invoiceId   → full invoice payload for print page
 *   GET  /api/admin/orders/:id/payment-link → resolve/refresh Stripe checkout URL
 */

const idParamSchema = z.object({ invoiceId: z.string().min(1).max(120) });
const orderIdParamSchema = z.object({ id: z.string().min(1).max(120) });
const listQuerySchema = z.object({
  cursor: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const adminInvoicesRoute: FastifyPluginAsync = async (app) => {
  // ── List all invoices ──────────────────────────────────────────────────────
  app.get("/api/admin/invoices", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }
    const { cursor, limit } = query.data;

    try {
      const invoices = await prisma.invoice.findMany({
        orderBy: { generatedAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
      });

      const hasMore = invoices.length > limit;
      const page = hasMore ? invoices.slice(0, limit) : invoices;
      const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

      return okResponse({
        items: page.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          countryCode: inv.countryCode,
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
        })),
        nextCursor,
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load invoices"));
    }
  });

  // ── Invoice detail for print page ──────────────────────────────────────────
  app.get<{ Params: { invoiceId: string } }>(
    "/api/admin/invoices/:invoiceId",
    async (request, reply) => {
      // Admin always; patient access validated by email match in the frontend
      // server component. We expose this endpoint to admin only from the API
      // side to keep the auth simple.
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: params.data.invoiceId },
          include: {
            order: {
              include: {
                items: {
                  select: {
                    id: true,
                    kind: true,
                    name: true,
                    quantity: true,
                    unitPriceCents: true,
                    lineTotalCents: true,
                    doctorId: true,
                    appointmentId: true,
                  },
                },
              },
            },
          },
        });

        if (!invoice) {
          return reply.status(404).send(errorResponse("Invoice not found"));
        }

        // Find the first consultation item that has a doctor assigned.
        const consultItem = invoice.order.items.find(
          (i) =>
            (i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION") &&
            i.doctorId,
        );

        let doctor: {
          fullName: string;
          registrationNumber: string | null;
          chamberEntity: string | null;
        } | null = null;

        if (consultItem?.doctorId) {
          // Fetch doctor name + all their country registrations in one query.
          const doctorRow = await prisma.doctor.findUnique({
            where: { id: consultItem.doctorId },
            select: {
              fullName: true,
              country: { select: { code: true } },
              additionalCountries: {
                select: {
                  registrationNumber: true,
                  chamberEntity: true,
                  country: { select: { code: true } },
                },
              },
            },
          });

          if (doctorRow) {
            const orderCountry = invoice.order.countryCode.toLowerCase();

            // Check primary country first, then additional countries.
            const allRegistrations = [
              {
                code: doctorRow.country.code.toLowerCase(),
                registrationNumber: null as string | null,
                chamberEntity: null as string | null,
              },
              ...doctorRow.additionalCountries.map((dc) => ({
                code: dc.country.code.toLowerCase(),
                registrationNumber: dc.registrationNumber,
                chamberEntity: dc.chamberEntity,
              })),
            ];

            // For the primary country there's no DoctorCountry row — look it up separately.
            const matchedReg = allRegistrations.find((r) => r.code === orderCountry);

            let regNumber: string | null = matchedReg?.registrationNumber ?? null;
            let chamberEntity: string | null = matchedReg?.chamberEntity ?? null;

            // Primary country: registration lives in DoctorCountry (the M:N row).
            if (!regNumber) {
              const dc = await prisma.doctorCountry.findFirst({
                where: {
                  doctorId: consultItem.doctorId,
                  country: { code: { equals: orderCountry, mode: "insensitive" } },
                },
                select: { registrationNumber: true, chamberEntity: true },
              });
              regNumber = dc?.registrationNumber ?? null;
              chamberEntity = dc?.chamberEntity ?? null;
            }

            doctor = {
              fullName: doctorRow.fullName,
              registrationNumber: regNumber,
              chamberEntity,
            };
          }
        }

        return okResponse({
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            countryCode: invoice.countryCode,
            generatedAt: invoice.generatedAt.toISOString(),
            emailSentAt: invoice.emailSentAt?.toISOString() ?? null,
          },
          order: {
            id: invoice.order.id,
            orderNumber: invoice.order.orderNumber,
            fullName: invoice.order.fullName,
            email: invoice.order.email,
            phone: invoice.order.phone,
            countryCode: invoice.order.countryCode,
            currencyCode: invoice.order.currencyCode,
            totalCents: invoice.order.totalCents,
            subtotalCents: invoice.order.subtotalCents,
            shippingCents: invoice.order.shippingCents,
            paymentStatus: invoice.order.paymentStatus,
            paidAt: invoice.order.paidAt?.toISOString() ?? null,
            items: invoice.order.items.map((i) => ({
              id: i.id,
              kind: i.kind,
              name: i.name,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
              lineTotalCents: i.lineTotalCents,
            })),
          },
          doctor,
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load invoice"));
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
