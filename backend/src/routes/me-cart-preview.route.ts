import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { computeEffectivePrices } from "../modules/orders/effective-pricing.service.js";
import { previewConsultationPricing } from "../modules/subscriptions/checkout-pricing.service.js";
import { resolveCorporateDiscountsForItems } from "../modules/corporate/corporate-benefit.service.js";

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
      // Corporate benefit preview (plan doc §3.3): mirror of the checkout
      // hook — automatic % discount on lines the subscription plan did
      // NOT benefit-price. Display-only; checkout recomputes.
      const corporateDiscounts = await resolveCorporateDiscountsForItems(prisma, {
        userId: user.id,
        items: cart.items.map((i) => ({
          id: i.id,
          kind: i.kind,
          serviceId: i.serviceId,
          baseCents: peakPriceByItemId.get(i.id) ?? i.unitPriceCents,
        })),
      });
      let savedOnCoverageLines = 0;
      let savedOnExtraLines = 0;
      const coverageLineById = new Map(coverage.lines.map((l) => [l.itemId, l]));
      const linesWithCorporate = coverage.lines.map((line) => {
        const corp = corporateDiscounts.get(line.itemId);
        const planBenefitApplied =
          line.mode === "CREDIT" ||
          ((line.mode === "PERCENT" || line.mode === "FIXED") &&
            line.finalUnitPriceCents < line.basePriceCents);
        if (!corp || planBenefitApplied) return { ...line, corporateDiscount: null };
        savedOnCoverageLines += corp.discountCents;
        return {
          ...line,
          finalUnitPriceCents: line.finalUnitPriceCents - corp.discountCents,
          savedCents: line.savedCents + corp.discountCents,
          corporateDiscount: {
            percent: corp.discountPercent,
            amountCents: corp.discountCents,
            companyName: corp.companyName,
            planName: corp.planName,
          },
        };
      });
      // Corporate member WITHOUT a subscription: coverage has no lines at
      // all, so synthesize corporate-discount lines for eligible items.
      let extraBaseCents = 0;
      let extraFinalCents = 0;
      for (const [itemId, corp] of corporateDiscounts) {
        if (coverageLineById.has(itemId)) continue;
        const item = cart.items.find((i) => i.id === itemId);
        if (!item) continue;
        const baseCents = peakPriceByItemId.get(itemId) ?? item.unitPriceCents;
        savedOnExtraLines += corp.discountCents;
        extraBaseCents += baseCents;
        extraFinalCents += baseCents - corp.discountCents;
        linesWithCorporate.push({
          itemId,
          serviceId: item.serviceId,
          mode: "NOT_COVERED" as const,
          basePriceCents: baseCents,
          finalUnitPriceCents: baseCents - corp.discountCents,
          creditsUsed: 0,
          savedCents: corp.discountCents,
          selection: "PAY_NORMAL" as const,
          reason: "NOT_COVERED" as const,
          eligibleSelections: ["PAY_NORMAL" as const],
          familyMemberId: null,
          familyMemberName: null,
          corporateDiscount: {
            percent: corp.discountPercent,
            amountCents: corp.discountCents,
            companyName: corp.companyName,
            planName: corp.planName,
          },
        });
      }
      return okResponse({
        ...coverage,
        lines: linesWithCorporate,
        totalBaseCents: coverage.totalBaseCents + extraBaseCents,
        totalFinalCents: coverage.totalFinalCents - savedOnCoverageLines + extraFinalCents,
        totalSavedCents: coverage.totalSavedCents + savedOnCoverageLines + savedOnExtraLines,
        currencyCode: cart.currencyCode,
      });
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
