import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { computeEffectivePrices } from "../modules/orders/effective-pricing.service.js";
import { previewConsultationPricing } from "../modules/subscriptions/checkout-pricing.service.js";

/**
 * GET /api/me/cart-preview — read-only subscription coverage for the patient's
 * current cart (§6). Shows which consultation lines are included (credit, €0),
 * discounted, or not covered, with the total saved, BEFORE checkout. Reserves
 * nothing; checkout recomputes authoritatively. Auth required (D15) — guests get
 * 401 so the UI can prompt "log in to use plan benefits".
 */
const meCartPreviewRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/cart-preview", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    try {
      const cart = await prisma.cart.findUnique({
        where: { userId: user.id },
        include: { items: { orderBy: { createdAt: "asc" } } },
      });
      const empty = {
        subscriptionId: null,
        planName: null,
        currencyCode: null,
        consultationCreditsRemaining: 0,
        lines: [],
        totalBaseCents: 0,
        totalFinalCents: 0,
        totalSavedCents: 0,
      };
      if (!cart || cart.items.length === 0) return okResponse(empty);

      const peakPriceByItemId = await computeEffectivePrices(cart.items);
      const coverage = await previewConsultationPricing({
        userId: user.id,
        countryCode: cart.countryCode,
        items: cart.items.map((i) => ({
          id: i.id,
          kind: i.kind,
          serviceId: i.serviceId,
          unitPriceCents: i.unitPriceCents,
          benefitSelection: i.benefitSelection,
          familyMemberId: i.familyMemberId,
        })),
        peakPriceByItemId,
      });
      return okResponse({ ...coverage, currencyCode: cart.currencyCode });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load cart preview"));
    }
  });
};

export default meCartPreviewRoute;
