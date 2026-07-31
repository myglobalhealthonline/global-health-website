import assert from "node:assert/strict";
import { join } from "node:path";
import { PrePaymentFlow } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * The website-checkout abandonment flow (PrePaymentFlow.WEB_CHECKOUT): 15-minute
 * pay window, ONE message ~5 minutes in, then a cancel that is silent for the
 * patient and the doctor.
 *
 * Same fixture trick as pre-payment-cancel-sweep.test.ts: orders carry NO
 * consultation items, so loadOrderContext returns null and every send path is a
 * no-op. What is under test here is the stage machine — who gets claimed, once —
 * not the message bodies.
 */
describe("web checkout abandonment", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./pre-payment-flow.service.js");
  let bootError: unknown = null;
  const createdOrderIds: string[] = [];

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./pre-payment-flow.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    // Scoped by explicit id — never a bare deleteMany (see test-guard.ts).
    for (const id of createdOrderIds) {
      await prisma.order.delete({ where: { id } }).catch(() => undefined);
    }
  });

  const skip = (): boolean => Boolean(bootError);
  const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

  async function webOrder(paymentDueAt: Date, stage = 1): Promise<string> {
    const order = await prisma.order.create({
      data: {
        email: "abandon@test.local",
        fullName: "Abandon Fixture",
        countryCode: "PT",
        currencyCode: "EUR",
        subtotalCents: 5000,
        shippingCents: 0,
        totalCents: 5000,
        status: "PENDING",
        paymentStatus: "PENDING",
        prePaymentFlow: PrePaymentFlow.WEB_CHECKOUT,
        prePaymentReminderStage: stage,
        paymentDueAt,
      },
    });
    createdOrderIds.push(order.id);
    return order.id;
  }

  it("nudges once the deadline is within 10 minutes, and never twice", async (t) => {
    if (skip()) return t.skip();
    // Deadline 9 minutes out = ~6 minutes into a 15-minute window.
    const orderId = await webOrder(minutesFromNow(9));

    await svc.runWebCheckoutAbandonNudge();
    const afterFirst = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(
      afterFirst.prePaymentReminderStage,
      svc.WEB_CHECKOUT_NUDGE_STAGE,
      "claimed the nudge stage",
    );
    assert.equal(afterFirst.status, "PENDING", "the nudge does not cancel anything");

    // A second tick overlapping the first must find nothing to claim.
    const second = await svc.runWebCheckoutAbandonNudge();
    assert.equal(
      second.candidates,
      0,
      "an already-nudged order is no longer a candidate — no duplicate message",
    );
  });

  it("leaves an order alone while the deadline is more than 10 minutes out", async (t) => {
    if (skip()) return t.skip();
    const orderId = await webOrder(minutesFromNow(14));

    await svc.runWebCheckoutAbandonNudge();

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(row.prePaymentReminderStage, 1, "first ~5 minutes are silent");
  });

  it("does not nudge an order that paid inside the window", async (t) => {
    if (skip()) return t.skip();
    const orderId = await webOrder(minutesFromNow(9));
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", paymentStatus: "PAID", prePaymentFlow: null, paymentDueAt: null },
    });

    await svc.runWebCheckoutAbandonNudge();

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(row.prePaymentReminderStage, 1, "a paid order is off the flow entirely");
  });

  it("cancels at the deadline and advances to the web cancel stage", async (t) => {
    if (skip()) return t.skip();
    const orderId = await webOrder(minutesFromNow(-1), 2);

    await svc.runPrePaymentCancelSweep();

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(row.status, "CANCELLED");
    assert.equal(row.paymentStatus, "FAILED");
    assert.equal(
      row.prePaymentReminderStage,
      svc.prePaymentCancelStage(PrePaymentFlow.WEB_CHECKOUT),
      "web flow cancels at stage 3, not the ladder's stage 6/7",
    );
  });

  it("keeps web orders off the hours-before-consultation reminder ladder", async (t) => {
    if (skip()) return t.skip();
    const orderId = await webOrder(minutesFromNow(9));

    await svc.runPrePaymentReminderCron();

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(
      row.prePaymentReminderStage,
      1,
      "the ladder cron must never touch a WEB_CHECKOUT order",
    );
  });

  it("has no reminder hours and a 3-stage machine", async (t) => {
    if (skip()) return t.skip();
    assert.deepEqual(svc.prePaymentReminderHours(PrePaymentFlow.WEB_CHECKOUT), []);
    assert.equal(svc.prePaymentCancelStage(PrePaymentFlow.WEB_CHECKOUT), 3);
    assert.equal(svc.WEB_CHECKOUT_NUDGE_STAGE, 2);
  });
});
