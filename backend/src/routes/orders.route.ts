import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { CartItemKind, OrderStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  getStripeClient,
  isStripeConfigured,
} from "../lib/stripe/client.js";
import { env } from "../config/env.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Orders + checkout.
 *
 *   POST /api/cart/checkout         → cart → Order PENDING + Stripe Session
 *   GET  /api/account/orders         → patient's own orders
 *   GET  /api/account/orders/:id     → patient's own order detail
 *   GET  /api/admin/orders           → admin list
 *   PATCH /api/admin/orders/:id      → status transitions (FULFILLED/CANCELLED)
 *
 * The payments webhook (in payments.route.ts) was extended to handle
 * `metadata.kind === "order"` events.
 */

const CART_COOKIE = "gh_cart";
const FLAT_SHIPPING_CENTS = 500; // €5 default

const checkoutBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
  fullName: z.string().trim().min(2, "Name too short").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  shipName: z.string().trim().min(2).max(120),
  shipLine1: z.string().trim().min(2).max(200),
  shipLine2: z.string().trim().max(200).optional().or(z.literal("")),
  shipCity: z.string().trim().min(2).max(120),
  shipPostalCode: z.string().trim().min(2).max(40),
  shipCountryCode: z.string().trim().min(2).max(4),
  /** Where Stripe should return after success / cancel — relative path. */
  returnTo: z
    .string()
    .trim()
    .regex(/^\/[a-z0-9/-]*$/i)
    .max(200)
    .optional(),
});

const orderIdParamSchema = z.object({ id: z.string().min(1).max(120) });
const adminPatchSchema = z.object({
  status: z.enum([OrderStatus.FULFILLED, OrderStatus.CANCELLED, OrderStatus.PAID]),
});

async function resolveActiveCartForCheckout(
  request: FastifyRequest,
): Promise<{
  cartId: string | null;
  userId: string | null;
}> {
  let userId: string | null = null;
  try {
    const user = await resolveOptionalAuthUser(request);
    if (user && user.role === "PATIENT") userId = user.id;
  } catch {
    // ignore
  }

  if (userId) {
    const userCart = await prisma.cart.findUnique({ where: { userId } });
    return { cartId: userCart?.id ?? null, userId };
  }

  const cookieToken = (request.cookies as Record<string, string | undefined>)[CART_COOKIE];
  if (!cookieToken) return { cartId: null, userId: null };
  const guestCart = await prisma.cart.findUnique({ where: { cookieToken } });
  return { cartId: guestCart?.id ?? null, userId: null };
}

const ordersRoute: FastifyPluginAsync = async (app) => {
  // ── Checkout: cart → Order PENDING + Stripe session ───────────────
  app.post(
    "/api/cart/checkout",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
      if (!isStripeConfigured()) {
        return reply
          .status(503)
          .send(errorResponse("Payments not configured. Set STRIPE_SECRET_KEY."));
      }

      const body = checkoutBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid checkout data", body.error.flatten()));
      }

      try {
        const { cartId, userId } = await resolveActiveCartForCheckout(request);
        if (!cartId) {
          return reply.status(400).send(errorResponse("Cart is empty"));
        }

        const cart = await prisma.cart.findUnique({
          where: { id: cartId },
          include: { items: { orderBy: { createdAt: "asc" } } },
        });
        if (!cart || cart.items.length === 0) {
          return reply.status(400).send(errorResponse("Cart is empty"));
        }

        const subtotalCents = cart.items.reduce(
          (s, i) => s + i.unitPriceCents * i.quantity,
          0,
        );
        const shippingCents = FLAT_SHIPPING_CENTS;
        const totalCents = subtotalCents + shippingCents;
        const currency = cart.currencyCode.toLowerCase();

        // Create Order + OrderItems in one tx so a partial state is impossible
        const order = await prisma.$transaction(async (tx) => {
          const created = await tx.order.create({
            data: {
              userId: userId ?? null,
              email: body.data.email,
              fullName: body.data.fullName,
              phone: body.data.phone || null,
              countryCode: cart.countryCode,
              currencyCode: cart.currencyCode,
              subtotalCents,
              shippingCents,
              totalCents,
              shipName: body.data.shipName,
              shipLine1: body.data.shipLine1,
              shipLine2: body.data.shipLine2 || null,
              shipCity: body.data.shipCity,
              shipPostalCode: body.data.shipPostalCode,
              shipCountryCode: body.data.shipCountryCode.toUpperCase(),
              items: {
                create: cart.items.map((i) => ({
                  kind: i.kind,
                  healthTestId: i.healthTestId,
                  serviceId: i.serviceId,
                  name: i.name,
                  unitPriceCents: i.unitPriceCents,
                  quantity: i.quantity,
                  lineTotalCents: i.unitPriceCents * i.quantity,
                  timeSlotId: i.timeSlotId,
                  doctorId: i.doctorId,
                })),
              },
            },
            include: { items: true },
          });
          return created;
        });

        // Build Stripe line_items (one per cart item + a shipping line)
        const stripe = getStripeClient();
        const lineItems: Array<{
          quantity: number;
          price_data: {
            currency: string;
            unit_amount: number;
            product_data: { name: string };
          };
        }> = order.items.map((i) => ({
          quantity: i.quantity,
          price_data: {
            currency,
            unit_amount: i.unitPriceCents,
            product_data: { name: i.name },
          },
        }));
        if (shippingCents > 0) {
          lineItems.push({
            quantity: 1,
            price_data: {
              currency,
              unit_amount: shippingCents,
              product_data: { name: "Shipping" },
            },
          });
        }

        const baseUrl =
          env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
        const returnBase = body.data.returnTo ?? "/checkout";
        const successUrl = `${baseUrl}${returnBase}/success?orderId=${order.id}`;
        const cancelUrl = `${baseUrl}${returnBase}/cancelled?orderId=${order.id}`;

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: body.data.email,
          client_reference_id: order.id,
          line_items: lineItems,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            kind: "order",
            orderId: order.id,
            countryCode: cart.countryCode,
          },
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { stripeSessionId: session.id, paymentStatus: "PENDING" },
        });

        // Clear the cart (items moved to order)
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.update({
          where: { id: cart.id },
          data: { countryCode: "", currencyCode: "" },
        });

        return okResponse({ orderId: order.id, url: session.url, sessionId: session.id });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Checkout failed"));
      }
    },
  );

  // ── Patient: list own orders ───────────────────────────────────────
  app.get("/api/account/orders", async (request, reply) => {
    let user;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      return reply.status(500).send(errorResponse("Auth error"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
    if (user.role !== "PATIENT" && user.role !== "ADMIN") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    try {
      const orders = await prisma.order.findMany({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      });
      return okResponse({
        items: orders.map((o) => ({
          id: o.id,
          status: o.status,
          paymentStatus: o.paymentStatus,
          countryCode: o.countryCode,
          currencyCode: o.currencyCode,
          subtotalCents: o.subtotalCents,
          shippingCents: o.shippingCents,
          totalCents: o.totalCents,
          itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load orders"));
    }
  });

  // ── Patient: own order detail ──────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    "/api/account/orders/:id",
    async (request, reply) => {
      let user;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        return reply.status(500).send(errorResponse("Auth error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const order = await prisma.order.findFirst({
          where: {
            id: params.data.id,
            OR: [{ userId: user.id }, { email: user.email }],
          },
          include: { items: true },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));
        return okResponse({
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          countryCode: order.countryCode,
          currencyCode: order.currencyCode,
          subtotalCents: order.subtotalCents,
          shippingCents: order.shippingCents,
          totalCents: order.totalCents,
          email: order.email,
          fullName: order.fullName,
          phone: order.phone,
          ship: {
            name: order.shipName,
            line1: order.shipLine1,
            line2: order.shipLine2,
            city: order.shipCity,
            postalCode: order.shipPostalCode,
            countryCode: order.shipCountryCode,
          },
          items: order.items.map((i) => ({
            id: i.id,
            kind: i.kind,
            name: i.name,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            lineTotalCents: i.lineTotalCents,
          })),
          paidAt: order.paidAt?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load order"));
      }
    },
  );

  // ── Admin: list all orders ─────────────────────────────────────────
  app.get("/api/admin/orders", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    try {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: true },
        take: 100,
      });
      return okResponse({
        items: orders.map((o) => ({
          id: o.id,
          status: o.status,
          paymentStatus: o.paymentStatus,
          email: o.email,
          fullName: o.fullName,
          countryCode: o.countryCode,
          currencyCode: o.currencyCode,
          totalCents: o.totalCents,
          itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load orders"));
    }
  });

  // ── Admin: order detail ────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    "/api/admin/orders/:id",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const order = await prisma.order.findUnique({
          where: { id: params.data.id },
          include: { items: true },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));
        return okResponse(order);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load order"));
      }
    },
  );

  // ── Admin: status transition ───────────────────────────────────────
  app.patch<{ Params: { id: string } }>(
    "/api/admin/orders/:id",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      const body = adminPatchSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      try {
        const order = await prisma.order.update({
          where: { id: params.data.id },
          data: { status: body.data.status },
        });
        return okResponse({ id: order.id, status: order.status });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not update order"));
      }
    },
  );
};

export default ordersRoute;

// Re-export kind enum for downstream
export { CartItemKind };
