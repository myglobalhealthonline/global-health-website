import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../../..", ".env") });

/**
 * Ops safety (§28/§39): the release sweep only frees terminally-abandoned,
 * expired reservations (never a committed one), and reconciliation flags
 * ledger↔balance mismatches + missing Stripe prices. Requires Postgres; skips
 * when unreachable.
 */
describe("subscription ops", () => {
  let prisma: Awaited<typeof import("../../../db/prisma.js")>["prisma"];
  let sweep: typeof import("./sweep.service.js");
  let recon: typeof import("./reconciliation.service.js");
  let credits: typeof import("../../credits/credit-balance.service.js");
  let makeSubscriptionFixture: typeof import("../test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../../db/prisma.js")).prisma;
      sweep = await import("./sweep.service.js");
      recon = await import("./reconciliation.service.js");
      credits = await import("../../credits/credit-balance.service.js");
      makeSubscriptionFixture = (await import("../test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  async function reservedOnOrder(
    fx: Awaited<ReturnType<typeof makeSubscriptionFixture>>,
    orderStatus: "PENDING" | "CANCELLED",
    reservedUntil: Date,
  ): Promise<{ reservationId: string; orderId: string }> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: `OPS-${randomUUID().slice(0, 10)}`,
          userId: fx.userId,
          email: "ops@test.local",
          fullName: "Ops",
          countryCode: fx.countryCode,
          currencyCode: "EUR",
          subtotalCents: 0,
          shippingCents: 0,
          totalCents: 0,
          status: orderStatus,
          items: {
            create: [
              { kind: "GENERAL_CONSULTATION", name: "GP", unitPriceCents: 0, quantity: 1, lineTotalCents: 0 },
            ],
          },
        },
        include: { items: true },
      });
      const reservationId = randomUUID();
      await credits.reserveCredits(tx, {
        userSubscriptionId: fx.subscriptionId,
        userId: fx.userId,
        kind: "CONSULTATION",
        amount: 1,
        reservationId,
        reservedUntil,
        serviceId: "svc",
        orderItemId: order.items[0]!.id,
      });
      return { reservationId, orderId: order.id };
    });
  }

  it("sweep releases an expired reservation on a CANCELLED order", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "ops-release", { consultationBalance: 2 });
    try {
      await reservedOnOrder(fx, "CANCELLED", new Date(Date.now() - 1000));
      assert.equal(await credits.getBalance(fx.subscriptionId, "CONSULTATION"), 1, "reserved");

      const result = await sweep.sweepExpiredReservations(new Date());
      assert.ok(result.consultationReleased >= 1);
      assert.equal(await credits.getBalance(fx.subscriptionId, "CONSULTATION"), 2, "credit restored");
    } finally {
      await fx.cleanup();
    }
  });

  it("sweep skips an expired reservation on a still-PENDING order", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "ops-skip", { consultationBalance: 2 });
    try {
      await reservedOnOrder(fx, "PENDING", new Date(Date.now() - 1000));
      await sweep.sweepExpiredReservations(new Date());
      assert.equal(
        await credits.getBalance(fx.subscriptionId, "CONSULTATION"),
        1,
        "open checkout not swept",
      );
    } finally {
      await fx.cleanup();
    }
  });

  it("sweep never releases a committed reservation", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "ops-committed", { consultationBalance: 2 });
    try {
      const { reservationId } = await reservedOnOrder(fx, "CANCELLED", new Date(Date.now() - 1000));
      // Commit it first (as a paid order would).
      await prisma.$transaction((tx) =>
        credits.commitReservation(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          kind: "CONSULTATION",
          amount: 1,
          reservationId,
        }),
      );
      await sweep.sweepExpiredReservations(new Date());
      assert.equal(
        await credits.getBalance(fx.subscriptionId, "CONSULTATION"),
        1,
        "committed credit stays spent",
      );
    } finally {
      await fx.cleanup();
    }
  });

  it("reconciliation flags ledger↔balance mismatch + missing Stripe price", async (t) => {
    if (skip()) return t.skip();
    // Balance counter = 5 but no ledger rows → sum 0 ≠ 5 (mismatch). Plan in a
    // subscriptions-enabled country with no stripePriceId → price-sync failure.
    const fx = await makeSubscriptionFixture(prisma, "ops-recon", {
      consultationBalance: 5,
      enableSubscriptions: true,
    });
    try {
      const report = await recon.runReconciliation(new Date());
      assert.ok(
        report.invariantAlerts.some(
          (a) => a.subscriptionId === fx.subscriptionId && a.kind === "ledger_balance_mismatch",
        ),
        "ledger↔balance mismatch flagged",
      );
      assert.ok(
        report.priceSyncFailures.some((p) => p.planId === fx.planId),
        "plan with no Stripe price flagged",
      );
    } finally {
      await fx.cleanup();
    }
  });

  it("renewal reminder: only ACTIVE, non-cancelling subs inside the 24h window", async (t) => {
    if (skip()) return t.skip();
    // Far-future dates so no real/seed subscription collides with the global count.
    const now = new Date("2099-01-12T12:00:00Z");
    const inWindow = new Date("2099-01-15T12:00:00Z"); // now + 3 days → in [now+3d, now+4d)
    const outOfWindow = new Date("2099-02-01T00:00:00Z"); // weeks away → excluded

    const due = await makeSubscriptionFixture(prisma, "rem-due", { status: "ACTIVE" });
    const cancelling = await makeSubscriptionFixture(prisma, "rem-cancel", { status: "ACTIVE" });
    const future = await makeSubscriptionFixture(prisma, "rem-future", { status: "ACTIVE" });
    try {
      await prisma.userSubscription.update({
        where: { id: due.subscriptionId },
        data: { currentPeriodEnd: inWindow, cancelAtPeriodEnd: false },
      });
      await prisma.userSubscription.update({
        where: { id: cancelling.subscriptionId },
        data: { currentPeriodEnd: inWindow, cancelAtPeriodEnd: true }, // cancelling → skip
      });
      await prisma.userSubscription.update({
        where: { id: future.subscriptionId },
        data: { currentPeriodEnd: outOfWindow, cancelAtPeriodEnd: false }, // out of window
      });

      const { remindersSent } = await sweep.sendDueRenewalReminders(now);
      assert.equal(remindersSent, 1, "exactly the one in-window, non-cancelling sub");
    } finally {
      await due.cleanup();
      await cancelling.cleanup();
      await future.cleanup();
    }
  });
});
