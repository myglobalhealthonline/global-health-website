import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { sendAbandonedCartEmail } from "../lib/email/templates.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Cron-triggered endpoint that emails patients who left items in their
 * cart for more than 1 hour and haven't been reminded yet.
 *
 *   POST /api/cron/abandoned-carts
 *   Header: X-Cron-Token: <CRON_SECRET>
 *
 * Pointed at by Railway cron (or any external scheduler) every ~15 min.
 * The token gate stops random callers from spamming patients.
 *
 * Only logged-in carts (Cart.userId not null) are processed — we don't
 * have an email for guest carts.
 */

const IDLE_MS = 60 * 60 * 1000; // 1 hour

const abandonedCartCronRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/cron/abandoned-carts", async (request, reply) => {
    // Token check — fail CLOSED. If CRON_SECRET is unset the endpoint is
    // unconfigured and must refuse all callers (never run unauthenticated).
    const expected = env.CRON_SECRET;
    const provided = request.headers["x-cron-token"];
    if (!expected) {
      app.log.error("CRON_SECRET is not set — refusing cron request");
      return reply.status(503).send(errorResponse("Cron endpoint is not configured"));
    }
    if (provided !== expected) {
      return reply.status(401).send(errorResponse("Invalid cron token"));
    }

    const cutoff = new Date(Date.now() - IDLE_MS);

    try {
      // Candidates: logged-in carts updated >1h ago, never reminded, with items
      const candidates = await prisma.cart.findMany({
        where: {
          userId: { not: null },
          abandonedEmailSentAt: null,
          updatedAt: { lt: cutoff },
          items: { some: {} },
        },
        include: {
          items: true,
        },
        take: 100,
      });

      // Batch-load the users in ONE query (was a findUnique per candidate =
      // up to 100 sequential round-trips per run), then look them up by id.
      const userIds = candidates
        .map((c) => c.userId)
        .filter((id): id is string => Boolean(id));
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, fullName: true },
      });
      const userById = new Map(users.map((u) => [u.id, u]));

      let sent = 0;
      for (const cart of candidates) {
        if (!cart.userId) continue;
        const user = userById.get(cart.userId);
        if (!user) continue;

        const subtotalCents = cart.items.reduce(
          (s, i) => s + i.unitPriceCents * i.quantity,
          0,
        );
        const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);
        const currency = cart.currencyCode || "EUR";
        const symbol =
          currency === "EUR" ? "€" : currency === "CZK" ? "Kč " : currency === "BRL" ? "R$" : `${currency} `;
        const totalLabel = `${symbol}${(subtotalCents / 100).toFixed(2)}`;

        try {
          await sendAbandonedCartEmail({
            to: user.email,
            fullName: user.fullName,
            itemCount,
            totalLabel,
          });
          await prisma.cart.update({
            where: { id: cart.id },
            data: { abandonedEmailSentAt: new Date() },
          });
          sent += 1;
        } catch (err) {
          app.log.warn({ err, cartId: cart.id }, "Abandoned cart email failed");
        }
      }

      return okResponse({ scanned: candidates.length, sent });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send(errorResponse("Cron job failed"));
    }
  });
};

export default abandonedCartCronRoute;
