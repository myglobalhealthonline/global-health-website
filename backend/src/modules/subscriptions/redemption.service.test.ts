import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Wellness redemption — MONEY path (§11/§36.6). Reserve deducts the wellness
 * counter + stock atomically; commit makes it permanent; release restores both;
 * commit/release are mutually exclusive per reservation. Requires Postgres;
 * skips when unreachable.
 *
 * The €0-postage path commits without Stripe. For the commit/release-terminal
 * cases we build a REQUESTED redemption + reservation directly (no Stripe), so
 * these tests never call the Stripe API.
 */
describe("wellness redemption money path", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./redemption.service.js");
  let credits: typeof import("../credits/credit-balance.service.js");
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./redemption.service.js");
      credits = await import("../credits/credit-balance.service.js");
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  function kitSnapshot(healthTestId: string, requiredWellnessCredits = 6) {
    return {
      snapshotVersion: 1,
      monthlyPriceCents: 4900,
      currencyCode: "EUR",
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 1,
      familyEnabled: false,
      consultationRules: [],
      perkRules: [],
      healthTestRules: [{ healthTestId, requiredWellnessCredits, unlockAfterPaidMonths: 0 }],
    };
  }

  interface Setup {
    fx: Awaited<ReturnType<typeof makeSubscriptionFixture>>;
    kitId: string;
    cleanup: () => Promise<void>;
  }

  async function setup(opts: {
    wellnessBalance: number;
    stock: number | null;
    shippingCents: number;
    status?: "ACTIVE" | "PAST_DUE" | "CANCELED";
    paidMonthsCount?: number;
    requiredCredits?: number;
  }): Promise<Setup> {
    const fx = await makeSubscriptionFixture(prisma, "redeem", {
      status: opts.status ?? "ACTIVE",
      paidMonthsCount: opts.paidMonthsCount ?? 2,
      wellnessBalance: opts.wellnessBalance,
    });
    const tag = fx.subscriptionId.slice(-8);
    const kit = await prisma.healthTest.create({
      data: {
        countryId: fx.countryId,
        slug: `kit-${tag}`,
        title: "General Health Home Blood Test",
        priceCents: 9900,
        currencyCode: "EUR",
        productImagePath: "/img.png",
        galleryImagePaths: [],
        whatThisTestCovers: [],
        whyGetTested: [],
        stock: opts.stock,
        shippingCents: opts.shippingCents,
      },
    });
    await prisma.userSubscription.update({
      where: { id: fx.subscriptionId },
      data: {
        planSnapshot: kitSnapshot(kit.id, opts.requiredCredits ?? 6) as unknown as object,
      },
    });
    const cleanup = async (): Promise<void> => {
      await prisma.healthTestRedemption.deleteMany({ where: { userId: fx.userId } });
      await prisma.order.deleteMany({ where: { userId: fx.userId } });
      await prisma.healthTest.deleteMany({ where: { id: kit.id } });
      await fx.cleanup();
    };
    return { fx, kitId: kit.id, cleanup };
  }

  const ship = {
    name: "Jane",
    line1: "1 Main St",
    city: "Dublin",
    postalCode: "D01",
    countryCode: "ie",
  };

  it("€0 postage: reserve deducts counter + stock, commits to REDEEMED", async (t) => {
    if (skip()) return t.skip();
    const s = await setup({ wellnessBalance: 6, stock: 5, shippingCents: 0 });
    try {
      const result = await svc.startRedemption({
        userId: s.fx.userId,
        email: "jane@test.local",
        fullName: "Jane",
        healthTestId: s.kitId,
        ship,
      });
      assert.equal(result.status, "APPROVED", "€0 commits immediately");
      assert.equal(result.checkoutUrl, undefined);
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 0, "6 credits spent");

      const kit = await prisma.healthTest.findUnique({ where: { id: s.kitId } });
      assert.equal(kit?.stock, 4, "stock decremented permanently");

      const redemption = await prisma.healthTestRedemption.findFirstOrThrow({
        where: { userId: s.fx.userId },
      });
      assert.equal(redemption.status, "APPROVED");
      const terminal = await prisma.wellnessCreditLedger.findFirst({
        where: { reservationId: redemption.id, reason: "REDEEMED" },
      });
      assert.ok(terminal, "REDEEMED terminal row written");
    } finally {
      await s.cleanup();
    }
  });

  it("insufficient credits → rejected, tx rolls back (no row, stock intact)", async (t) => {
    if (skip()) return t.skip();
    const s = await setup({ wellnessBalance: 3, stock: 5, shippingCents: 0, requiredCredits: 6 });
    try {
      await assert.rejects(
        svc.startRedemption({
          userId: s.fx.userId,
          email: "j@test.local",
          fullName: "Jane",
          healthTestId: s.kitId,
          ship,
        }),
        (err: Error) => (err as { code?: string }).code === "INSUFFICIENT_CREDITS",
      );
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 3, "counter untouched");
      const kit = await prisma.healthTest.findUnique({ where: { id: s.kitId } });
      assert.equal(kit?.stock, 5, "stock restored by rollback");
      const count = await prisma.healthTestRedemption.count({ where: { userId: s.fx.userId } });
      assert.equal(count, 0, "no redemption persisted");
    } finally {
      await s.cleanup();
    }
  });

  it("out of stock (stock=0) → rejected before any deduction", async (t) => {
    if (skip()) return t.skip();
    const s = await setup({ wellnessBalance: 6, stock: 0, shippingCents: 0 });
    try {
      await assert.rejects(
        svc.startRedemption({
          userId: s.fx.userId,
          email: "j@test.local",
          fullName: "Jane",
          healthTestId: s.kitId,
          ship,
        }),
        (err: Error) => (err as { code?: string }).code === "OUT_OF_STOCK",
      );
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 6, "credits not deducted");
    } finally {
      await s.cleanup();
    }
  });

  it("PAST_DUE subscription → redemption blocked (D6 active-sub required)", async (t) => {
    if (skip()) return t.skip();
    const s = await setup({ wellnessBalance: 6, stock: 5, shippingCents: 0, status: "PAST_DUE" });
    try {
      await assert.rejects(
        svc.startRedemption({
          userId: s.fx.userId,
          email: "j@test.local",
          fullName: "Jane",
          healthTestId: s.kitId,
          ship,
        }),
        (err: Error) => (err as { code?: string }).code === "NOT_ELIGIBLE",
      );
    } finally {
      await s.cleanup();
    }
  });

  // ── commit/release terminal exclusivity (no Stripe) ───────────────────
  async function buildPendingRedemption(s: Setup, requiredCredits = 6): Promise<string> {
    return prisma.$transaction(async (tx) => {
      await tx.healthTest.update({ where: { id: s.kitId }, data: { stock: { decrement: 1 } } });
      const redemption = await tx.healthTestRedemption.create({
        data: {
          userId: s.fx.userId,
          userSubscriptionId: s.fx.subscriptionId,
          healthTestId: s.kitId,
          wellnessCreditsSpent: requiredCredits,
          status: "REQUESTED",
        },
      });
      await credits.reserveCredits(tx, {
        userSubscriptionId: s.fx.subscriptionId,
        userId: s.fx.userId,
        kind: "WELLNESS",
        amount: requiredCredits,
        reservationId: redemption.id,
        reservedUntil: new Date(Date.now() + 900_000),
        healthTestId: s.kitId,
        redemptionId: redemption.id,
      });
      const order = await tx.order.create({
        data: {
          orderNumber: `RDM-${redemption.id.slice(-10)}`,
          userId: s.fx.userId,
          email: "j@test.local",
          fullName: "Jane",
          countryCode: s.fx.countryCode,
          currencyCode: "EUR",
          subtotalCents: 0,
          shippingCents: 500,
          totalCents: 500,
          paymentStatus: "PENDING",
        },
      });
      await tx.healthTestRedemption.update({
        where: { id: redemption.id },
        data: { orderId: order.id },
      });
      return redemption.id;
    });
  }

  it("commit on payment → REDEEMED; later release is a no-op (terminal exclusivity)", async (t) => {
    if (skip()) return t.skip();
    const s = await setup({ wellnessBalance: 6, stock: 5, shippingCents: 500 });
    try {
      const redemptionId = await buildPendingRedemption(s);
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 0, "reserved");

      await svc.commitRedemption(redemptionId);
      let r = await prisma.healthTestRedemption.findUniqueOrThrow({ where: { id: redemptionId } });
      assert.equal(r.status, "APPROVED");
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 0, "stays spent");

      // Release after commit must be blocked by the terminal-uniqueness index.
      await svc.releaseRedemption(redemptionId);
      r = await prisma.healthTestRedemption.findUniqueOrThrow({ where: { id: redemptionId } });
      assert.equal(r.status, "APPROVED", "still approved — not reverted");
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 0, "no double restore");
      const kit = await prisma.healthTest.findUnique({ where: { id: s.kitId } });
      assert.equal(kit?.stock, 4, "stock stays decremented");
    } finally {
      await s.cleanup();
    }
  });

  it("release on abandon → RELEASED terminal, credits + stock restored, order CANCELLED", async (t) => {
    if (skip()) return t.skip();
    const s = await setup({ wellnessBalance: 6, stock: 5, shippingCents: 500 });
    try {
      const redemptionId = await buildPendingRedemption(s);
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 0);
      const kitAfterReserve = await prisma.healthTest.findUnique({ where: { id: s.kitId } });
      assert.equal(kitAfterReserve?.stock, 4, "stock reserved");

      await svc.releaseRedemption(redemptionId);
      assert.equal(await credits.getBalance(s.fx.subscriptionId, "WELLNESS"), 6, "credits restored");
      const kit = await prisma.healthTest.findUnique({ where: { id: s.kitId } });
      assert.equal(kit?.stock, 5, "stock restored");
      const r = await prisma.healthTestRedemption.findUniqueOrThrow({ where: { id: redemptionId } });
      assert.equal(r.status, "CANCELED");
      if (r.orderId) {
        const order = await prisma.order.findUniqueOrThrow({ where: { id: r.orderId } });
        assert.equal(order.status, "CANCELLED");
      }
      const terminal = await prisma.wellnessCreditLedger.findFirst({
        where: { reservationId: redemptionId, reason: "RELEASED" },
      });
      assert.ok(terminal, "RELEASED terminal row");
    } finally {
      await s.cleanup();
    }
  });
});
