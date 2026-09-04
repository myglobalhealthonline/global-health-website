import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { resolveActiveCart } from "../modules/cart/resolve-active-cart.js";
import { computeEffectivePrices } from "../modules/orders/effective-pricing.service.js";
import { resolveCoupon, isIdentityReason } from "../modules/coupons/coupon-eligibility.js";
import { applyCouponToCart } from "../modules/coupons/coupon-distribution.js";
import { couponAppliesToKind } from "../modules/coupons/coupon-scope.js";
import { minimumChargeCents } from "../modules/orders/stripe-minimum-charge.js";

/**
 * Public coupon check for the checkout page.
 *
 *   POST /api/coupons/check   { code, email } → { valid, discountPercent, discountCents }
 *
 * CART-AWARE on purpose. Three of the refusal rules — insurance/coverage lines,
 * benefit-priced lines, commission markets — depend on what is in the cart, not
 * on the code. A code-only endpoint would light up green and then fail at the
 * pay button, which is the one outcome worth engineering against.
 *
 * POST rather than GET so the code never lands in an access log, a `Referer`
 * header or browser history.
 *
 * ENUMERATION SAFETY: every IDENTITY failure (no such code, expired, disabled,
 * fully redeemed, locked to another address) returns one byte-identical body,
 * following the deliberate no-"not found"-state decision in the membership
 * claim form. ELIGIBILITY failures do return their reason — they confirm the
 * code exists, which is an accepted trade: somebody holding a code we emailed
 * them, told only "invalid", contacts support instead of paying. The 10/min
 * limit and 10-character codes are what make that trade safe.
 *
 * The answer here is advisory. `POST /api/cart/checkout` re-resolves the code
 * and atomically re-claims the cap inside its own transaction; that is the
 * decision that charges money.
 */
const checkBodySchema = z.object({
  code: z.string().trim().max(32),
  // Required: a PERSONAL code cannot be decided without knowing who is booking,
  // and answering "valid" before checking would leak it to anyone.
  email: z.string().trim().toLowerCase().email(),
});

/** One shape for every identity failure — do not branch this. */
const OPAQUE_INVALID = { valid: false as const, reason: null };

const couponsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/api/coupons/check",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = checkBodySchema.safeParse(request.body);
      // A malformed body is not told apart from a bad code, for the same reason
      // a malformed CODE is not: both would narrow the search space.
      if (!body.success) return okResponse(OPAQUE_INVALID);

      try {
        const { cartId } = await resolveActiveCart(request);
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

        const hasCoverageLine = cart.items.some(
          (i) => i.insuranceCompanyId || i.declaredCoverageSource,
        );
        // Mirrors the checkout's own primary test: a declared benefit source is
        // what makes an engine run there, so it is what decides here.
        const hasBenefitLine =
          cart.benefitSource === "MEMBERSHIP" ||
          cart.benefitSource === "CORPORATE" ||
          cart.benefitSource === "PUBLIC_PLAN";

        const result = await resolveCoupon({
          code: body.data.code,
          email: body.data.email,
          countryCode: cart.countryCode,
          hasCoverageLine,
          hasBenefitLine,
          lineKinds: cart.items.map((i) => i.kind),
        });

        if (!result.ok) {
          return okResponse(
            isIdentityReason(result.reason)
              ? OPAQUE_INVALID
              : { valid: false as const, reason: result.reason },
          );
        }

        // Exact cents, computed the way the checkout will compute them — the
        // authoritative peak/insurance recompute, then the coupon rounded per
        // unit. The page never has to approximate, so the number in the order
        // summary is the number charged.
        const effectivePriceByItemId = await computeEffectivePrices(cart.items);
        // Lines outside the coupon's scope keep their full price, so the figure
        // shown here is the one the checkout will charge.
        const grossLines = cart.items
          .filter((i) => couponAppliesToKind(result.coupon.scope, i.kind))
          .map((i) => ({
            grossUnitCents: effectivePriceByItemId.get(i.id) ?? i.unitPriceCents,
            quantity: i.quantity,
          }));
        const outOfScopeCents = cart.items
          .filter((i) => !couponAppliesToKind(result.coupon.scope, i.kind))
          .reduce(
            (sum, i) => sum + (effectivePriceByItemId.get(i.id) ?? i.unitPriceCents) * i.quantity,
            0,
          );
        const shippingCents = cart.items.reduce(
          (s, i) => s + (i.shippingCents ?? 0) * i.quantity,
          0,
        );
        const applied = applyCouponToCart(grossLines, result.coupon.discountPercent);
        const totalCents = applied.subtotalCents + outOfScopeCents + shippingCents;

        // Shown as a refusal rather than a silent surprise at the pay button:
        // between zero and the currency floor there is no chargeable session.
        if (totalCents > 0 && totalCents < minimumChargeCents(cart.currencyCode)) {
          return okResponse({ valid: false as const, reason: "BELOW_MINIMUM" });
        }

        return okResponse({
          valid: true as const,
          code: result.coupon.code,
          discountPercent: result.coupon.discountPercent,
          discountCents: applied.discountCents,
          totalCents,
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        request.log.error(err);
        return reply.status(500).send(errorResponse("Could not check that code"));
      }
    },
  );
};

export default couponsRoutes;
