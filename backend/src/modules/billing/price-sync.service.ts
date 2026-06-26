import { prisma } from "../../db/prisma.js";
import { getBillingPort } from "./billing.factory.js";

/**
 * syncPlanStripePrice — the published contract Sprint 2's admin service calls
 * after a plan create / price edit (contracts.md).
 *
 * Creates the Stripe Product once, then a Price. Stripe Prices are IMMUTABLE
 * (§22), so an amount change creates a NEW Price, archives the old one, updates
 * `plan.stripePriceId`, and records a `PlanStripePrice` history row. Existing
 * subscribers keep their grandfathered price (D22) — only new subscribers bind
 * to the new Price.
 *
 * Throws on any billing-provider failure; the caller MUST surface it (hard-fail
 * + alert, §39) — a plan must never be left without a valid Price.
 */
export async function syncPlanStripePrice(
  planId: string,
): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const billing = getBillingPort();
  const plan = await prisma.pricingPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new Error(`syncPlanStripePrice: plan ${planId} not found`);
  }

  // 1. Ensure a Product exists for this plan. Treat any leftover fake-driver id
  //    (from before BILLING_DRIVER=stripe) as missing so we mint a real one.
  let stripeProductId =
    plan.stripeProductId && !plan.stripeProductId.includes("_fake_")
      ? plan.stripeProductId
      : null;
  if (!stripeProductId) {
    const product = await billing.ensureProduct({ planId: plan.id, name: plan.name });
    stripeProductId = product.productId;
  }

  // 2. Decide whether a new Price is needed. The active history row reflects
  //    the amount the current Price encodes; if it already matches, no-op.
  const activePrice = await prisma.planStripePrice.findFirst({
    where: { planId: plan.id, active: true },
  });
  const amountMatches =
    activePrice != null &&
    activePrice.amountCents === plan.monthlyPriceCents &&
    activePrice.currency.toLowerCase() === plan.currencyCode.toLowerCase() &&
    plan.stripePriceId === activePrice.stripePriceId &&
    // A fake-driver price never exists in real Stripe — force a re-create.
    !activePrice.stripePriceId.includes("_fake_");

  if (amountMatches && stripeProductId === plan.stripeProductId) {
    return { stripeProductId, stripePriceId: plan.stripePriceId! };
  }

  // 3. Create the new immutable Price.
  const price = await billing.createPrice({
    productId: stripeProductId,
    amountCents: plan.monthlyPriceCents,
    currency: plan.currencyCode,
    interval: "MONTHLY",
  });

  // 4. Archive the previous active Price (best-effort on the provider; the DB
  //    history is the source of truth for reconciliation).
  if (activePrice && activePrice.stripePriceId !== price.priceId) {
    await billing.archivePrice(activePrice.stripePriceId).catch(() => {
      // Provider archive failures are non-fatal — the new Price is live and
      // the history row below records the transition for reconciliation.
    });
  }

  // 5. Persist: update the plan + write the history rows in one tx.
  await prisma.$transaction(async (tx) => {
    if (activePrice && activePrice.stripePriceId !== price.priceId) {
      await tx.planStripePrice.update({
        where: { id: activePrice.id },
        data: { active: false, archivedAt: new Date() },
      });
    }
    await tx.planStripePrice.upsert({
      where: { stripePriceId: price.priceId },
      create: {
        planId: plan.id,
        stripePriceId: price.priceId,
        amountCents: plan.monthlyPriceCents,
        currency: plan.currencyCode,
        active: true,
      },
      update: { active: true, archivedAt: null },
    });
    await tx.pricingPlan.update({
      where: { id: plan.id },
      data: { stripeProductId, stripePriceId: price.priceId },
    });
  });

  return { stripeProductId, stripePriceId: price.priceId };
}
