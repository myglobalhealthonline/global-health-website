import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { computeEffectivePrices } from "../modules/orders/effective-pricing.service.js";
import { previewConsultationPricing } from "../modules/subscriptions/checkout-pricing.service.js";
import {
  resolveCorporateDiscountsForItems,
  type CorporateDiscount,
} from "../modules/corporate/corporate-benefit.service.js";
import { planMembershipCheckout } from "../modules/memberships/membership-checkout.service.js";

/**
 * GET /api/me/cart-preview — read-only subscription coverage for the patient's
 * current cart (§6). Shows which consultation lines are included (credit, €0),
 * discounted, or not covered, with the total saved, BEFORE checkout. Reserves
 * nothing; checkout recomputes authoritatively. Auth required (D15) — guests get
 * 401 so the UI can prompt "log in to use plan benefits".
 */
const localeQuerySchema = z.object({
  // .catch(undefined): an unknown locale falls back to the country default
  // instead of failing the whole query parse.
  locale: z
    .preprocess((v) => (typeof v === "string" ? v.toUpperCase() : v), z.nativeEnum(LocaleCode).optional())
    .catch(undefined),
});

const meCartPreviewRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/cart-preview", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    const query = localeQuerySchema.safeParse(request.query);
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
      // Insurance-priced lines are excluded from the plan + corporate engines
      // here exactly as they are at checkout (orders.route) — the negotiated
      // insurance price is final. They're folded back into the totals below.
      const benefitItems = cart.items.filter((i) => !i.insuranceCompanyId);

      // Mirror of §6.4's checkout switch. Not a nicety: if the preview ran an
      // engine checkout will not, the patient is shown a total that is not the
      // one they get charged. UNSET is displayed as NONE — checkout decides
      // whether that cart is actually checkout-able, and a preview must never
      // be the thing that blocks it.
      const benefitSource = cart.benefitSource === "UNSET" ? "NONE" : cart.benefitSource;

      const membership =
        benefitSource === "MEMBERSHIP"
          ? await planMembershipCheckout(prisma, {
              userId: user.id,
              enrollmentId: cart.membershipEnrollmentId,
              items: benefitItems.map((i) => ({ id: i.id, serviceId: i.serviceId })),
              fullPriceByItemId: new Map(
                benefitItems.map((i) => [i.id, peakPriceByItemId.get(i.id) ?? i.unitPriceCents]),
              ),
            }).catch(() => null)
          : null;

      const coverage = await previewConsultationPricing({
        userId: user.id,
        countryCode: cart.countryCode,
        // Only when the patient chose the public plan. The subscription's own
        // fields (plan name, credits remaining) still come back, so the UI can
        // say "you have 3 credits" while correctly not spending one here.
        items: (benefitSource === "PUBLIC_PLAN" ? benefitItems : []).map((i) => ({
          id: i.id,
          kind: i.kind,
          serviceId: i.serviceId,
          unitPriceCents: i.unitPriceCents,
          benefitSelection: i.benefitSelection,
          familyMemberId: i.familyMemberId,
        })),
        peakPriceByItemId,
        locale: query.success ? query.data.locale : undefined,
      });
      // Corporate benefit preview (plan doc §3.3): mirror of the checkout
      // hook — automatic % discount on lines the subscription plan did
      // NOT benefit-price. Display-only; checkout recomputes.
      const corporateDiscounts =
        benefitSource === "CORPORATE"
          ? await resolveCorporateDiscountsForItems(prisma, {
              userId: user.id,
              items: benefitItems.map((i) => ({
                id: i.id,
                kind: i.kind,
                serviceId: i.serviceId,
                baseCents: peakPriceByItemId.get(i.id) ?? i.unitPriceCents,
              })),
            })
          : new Map<string, CorporateDiscount>();
      let savedOnCoverageLines = 0;
      let savedOnExtraLines = 0;
      const coverageLineById = new Map(coverage.lines.map((l) => [l.itemId, l]));
      type PreviewLine = (typeof coverage.lines)[number] & {
        corporateDiscount: {
          percent: number;
          amountCents: number;
          /** INCLUDED / COPAY / DISCOUNT — the cart shows "included" or a
           *  co-pay amount instead of a percentage for the first two. */
          coverage: CorporateDiscount["coverage"];
          /** What the member pays, COPAY only. */
          copayCents: number | null;
          companyName: string;
          planName: string;
        } | null;
        membership?: { label: string; savedCents: number; allowanceUsed: boolean } | null;
      };
      const linesWithCorporate: PreviewLine[] = coverage.lines.map((line) => {
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
            coverage: corp.coverage,
            copayCents: corp.copayCents,
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
            coverage: corp.coverage,
            copayCents: corp.copayCents,
            companyName: corp.companyName,
            planName: corp.planName,
          },
        });
      }
      // Membership lines (§6.2). Same shape as the corporate synthesis above:
      // coverage has no line for them, because the subscription engine did not
      // run, so they are added here at the member price.
      let membershipBaseCents = 0;
      let membershipFinalCents = 0;
      let savedOnMembershipLines = 0;
      // Patient-facing label for the membership badge. Same shape the booking
      // step shows ("<plan> — <level>"), so the cart names the benefit the
      // patient picked rather than an unexplained €0.
      const locale = query.success ? query.data.locale : undefined;
      const named = (
        translations: { locale: LocaleCode; name: string }[],
        fallback: string,
      ): string => (locale ? translations.find((t) => t.locale === locale)?.name ?? fallback : fallback);
      const membershipLabel = membership
        ? `${named(membership.naming.planTranslations, membership.naming.planName)} — ${named(
            membership.naming.levelTranslations,
            membership.naming.levelName,
          )}`
        : null;
      for (const [itemId, line] of membership?.lines ?? []) {
        const item = cart.items.find((i) => i.id === itemId);
        if (!item) continue;
        const baseCents = peakPriceByItemId.get(itemId) ?? item.unitPriceCents;
        membershipBaseCents += baseCents;
        membershipFinalCents += line.unitPriceCents;
        savedOnMembershipLines += line.discountCents;
        linesWithCorporate.push({
          itemId,
          serviceId: item.serviceId,
          mode: "NOT_COVERED" as const,
          basePriceCents: baseCents,
          finalUnitPriceCents: line.unitPriceCents,
          creditsUsed: 0,
          savedCents: line.discountCents,
          selection: "PAY_NORMAL" as const,
          reason: "NOT_COVERED" as const,
          eligibleSelections: ["PAY_NORMAL" as const],
          familyMemberId: null,
          familyMemberName: null,
          corporateDiscount: null,
          // Marks the line as membership-priced. Without it a €0 allowance
          // line is indistinguishable from an insurance one, and the cart
          // panel shows the list price beside a charge of nothing.
          membership: {
            label: membershipLabel ?? "",
            savedCents: line.discountCents,
            allowanceUsed: line.allowanceUsed,
          },
        });
      }

      // Fold insurance-priced lines back in at their negotiated price with no
      // plan/corporate saving, so the preview total matches what checkout charges.
      let insuranceBaseCents = 0;
      for (const item of cart.items) {
        if (!item.insuranceCompanyId) continue;
        const priceCents = peakPriceByItemId.get(item.id) ?? item.unitPriceCents;
        insuranceBaseCents += priceCents;
        linesWithCorporate.push({
          itemId: item.id,
          serviceId: item.serviceId,
          mode: "NOT_COVERED" as const,
          basePriceCents: priceCents,
          finalUnitPriceCents: priceCents,
          creditsUsed: 0,
          savedCents: 0,
          selection: "PAY_NORMAL" as const,
          reason: "NOT_COVERED" as const,
          eligibleSelections: ["PAY_NORMAL" as const],
          familyMemberId: null,
          familyMemberName: null,
          corporateDiscount: null,
        });
      }
      return okResponse({
        ...coverage,
        lines: linesWithCorporate,
        totalBaseCents:
          coverage.totalBaseCents + extraBaseCents + insuranceBaseCents + membershipBaseCents,
        totalFinalCents:
          coverage.totalFinalCents -
          savedOnCoverageLines +
          extraFinalCents +
          insuranceBaseCents +
          membershipFinalCents,
        totalSavedCents:
          coverage.totalSavedCents +
          savedOnCoverageLines +
          savedOnExtraLines +
          savedOnMembershipLines,
        benefitSource,
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
