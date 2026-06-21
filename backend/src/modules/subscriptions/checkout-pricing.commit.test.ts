import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Order-level consultation reservation commit/release (§36.3) — the path the
 * payments webhook (pay → commit) and the order-expiry / sweep (abandon →
 * release) drive. Requires Postgres; skips when unreachable.
 */
describe("order credit reservation commit/release", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let cp: typeof import("./checkout-pricing.service.js");
  let credits: typeof import("../credits/credit-balance.service.js");
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      cp = await import("./checkout-pricing.service.js");
      credits = await import("../credits/credit-balance.service.js");
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  function creditSnapshot() {
    return {
      snapshotVersion: 1,
      monthlyPriceCents: 4900,
      currencyCode: "EUR",
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 0,
      familyEnabled: false,
      consultationRules: [
        {
          serviceId: "svc-x",
          isIncluded: true,
          usesCredits: true,
          creditsPerUse: 1,
          discountMode: "NONE",
          discountPercent: null,
          fixedPriceCents: null,
          unlockAfterPaidMonths: 0,
          familyUsable: false,
        },
      ],
      perkRules: [],
      healthTestRules: [],
    };
  }

  /** Create an order with one €0 credit-covered consultation line + reservation. */
  async function reservedOrder(
    fx: Awaited<ReturnType<typeof makeSubscriptionFixture>>,
  ): Promise<string> {
    const order = await prisma.order.create({
      data: {
        orderNumber: `CP-${fx.subscriptionId.slice(-10)}`,
        userId: fx.userId,
        email: "cp@test.local",
        fullName: "CP",
        countryCode: fx.countryCode,
        currencyCode: "EUR",
        subtotalCents: 0,
        shippingCents: 0,
        totalCents: 0,
        status: "PENDING",
        items: {
          create: [
            { kind: "GENERAL_CONSULTATION", serviceId: "svc-x", name: "GP", unitPriceCents: 0, quantity: 1, lineTotalCents: 0 },
          ],
        },
      },
      include: { items: true },
    });
    const orderItemId = order.items[0]!.id;
    await prisma.$transaction(async (tx) => {
      const result = await cp.reserveAndPriceConsultations(tx, {
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [{ id: orderItemId, kind: "GENERAL_CONSULTATION", serviceId: "svc-x", unitPriceCents: 5000 }],
        peakPriceByItemId: new Map([[orderItemId, 5000]]),
      });
      assert.equal(result.lines.get(orderItemId)?.creditCovered, true, "credit reserved");
      await cp.linkReservationsToOrderItems(tx, result.lines, new Map([[orderItemId, orderItemId]]));
    });
    return order.id;
  }

  it("commit on payment → CONSUMED, credit stays spent", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "cp-commit", {
      status: "ACTIVE",
      consultationBalance: 1,
      planSnapshot: creditSnapshot(),
    });
    try {
      const orderId = await reservedOrder(fx);
      assert.equal(await credits.getBalance(fx.subscriptionId, "CONSULTATION"), 0);

      await cp.commitOrderCreditReservations(orderId);
      const consumed = await prisma.consultationCreditLedger.findFirst({
        where: { reason: "CONSUMED", userSubscriptionId: fx.subscriptionId },
      });
      assert.ok(consumed, "CONSUMED terminal written");
      assert.equal(await credits.getBalance(fx.subscriptionId, "CONSULTATION"), 0, "stays spent");
    } finally {
      await fx.cleanup();
    }
  });

  it("release on abandon → RELEASED, credit restored", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "cp-release", {
      status: "ACTIVE",
      consultationBalance: 1,
      planSnapshot: creditSnapshot(),
    });
    try {
      const orderId = await reservedOrder(fx);
      assert.equal(await credits.getBalance(fx.subscriptionId, "CONSULTATION"), 0);

      await cp.releaseOrderCreditReservations(orderId);
      const released = await prisma.consultationCreditLedger.findFirst({
        where: { reason: "RELEASED", userSubscriptionId: fx.subscriptionId },
      });
      assert.ok(released, "RELEASED terminal written");
      assert.equal(await credits.getBalance(fx.subscriptionId, "CONSULTATION"), 1, "credit restored");
    } finally {
      await fx.cleanup();
    }
  });
});
