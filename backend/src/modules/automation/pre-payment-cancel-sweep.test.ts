import assert from "node:assert/strict";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrePaymentFlow } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Regression test for ORD-000167: an order whose payment deadline fell at 12:25
 * was not cancelled until 12:34.
 *
 * The cancel used to live inside runPrePaymentReminderCron, which ticks every
 * 15 minutes and whose body can run for minutes (WhatsApp sends are globally
 * serialized behind a 6s gap in wasender.ts). A deadline was therefore enforced
 * anywhere from 0 to ~15 minutes late — worst for urgent bookings, which get a
 * 5-minute pay window from computePrePaymentPlan.
 *
 * Deadline enforcement now lives in runPrePaymentCancelSweep on its own 60s
 * tick, and the reminder cron no longer touches past-due orders at all.
 *
 * Fixtures deliberately carry NO consultation items: loadOrderContext returns
 * null without them, so sendPrePaymentCancelledNotifications is a no-op and the
 * test exercises the sweep's claim/cancel logic offline and deterministically.
 */
describe("runPrePaymentCancelSweep", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./pre-payment-flow.service.js");
  let bootError: unknown = null;
  const createdOrderIds: string[] = [];
  const createdAppointmentIds: string[] = [];

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
    for (const id of createdAppointmentIds) {
      await prisma.appointment.delete({ where: { id } }).catch(() => undefined);
    }
  });

  const skip = (): boolean => Boolean(bootError);

  async function pendingOrder(
    paymentDueAt: Date,
    stage = 1,
    extra: { appointmentIds?: string[] } = {},
  ): Promise<string> {
    const order = await prisma.order.create({
      data: {
        email: "sweep@test.local",
        fullName: "Sweep Fixture",
        countryCode: "PT",
        currencyCode: "EUR",
        subtotalCents: 5000,
        shippingCents: 0,
        totalCents: 5000,
        status: "PENDING",
        paymentStatus: "UNPAID",
        prePaymentFlow: PrePaymentFlow.WITHIN_48H,
        prePaymentReminderStage: stage,
        paymentDueAt,
        appointmentIds: extra.appointmentIds ?? [],
      },
    });
    createdOrderIds.push(order.id);
    return order.id;
  }

  const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

  it("cancels an order once its payment deadline has passed", async (t) => {
    if (skip()) return t.skip();
    const orderId = await pendingOrder(minutesFromNow(-1));

    // The sweep takes 100 due orders at a time, oldest deadline first. Other
    // suites running concurrently leave PENDING orders whose deadlines are far
    // further in the past than this one's minute, so a single pass can fill its
    // batch entirely with theirs and never reach this order — reporting
    // `cancelled: 0` while this order sits untouched.
    //
    // Sweeping until THIS order is done tests the same behaviour without
    // asserting on a global counter that neighbouring suites can crowd out.
    let cancelled = 0;
    for (let pass = 0; pass < 5; pass += 1) {
      cancelled += (await svc.runPrePaymentCancelSweep()).cancelled;
      const seen = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
      if (seen.status === "CANCELLED") break;
    }
    assert.ok(cancelled >= 1, "the sweep reports what it cancelled");

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(row.status, "CANCELLED", "past-due order is cancelled");
    assert.equal(row.paymentStatus, "FAILED");
    assert.equal(
      row.prePaymentReminderStage,
      svc.prePaymentCancelStage(PrePaymentFlow.WITHIN_48H),
      "advanced to the cancel stage so no reminder can follow it",
    );
  });

  it("leaves an order whose deadline has not passed yet", async (t) => {
    if (skip()) return t.skip();
    const orderId = await pendingOrder(minutesFromNow(30));

    await svc.runPrePaymentCancelSweep();

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(row.status, "PENDING", "not-yet-due order is untouched");
    assert.equal(row.prePaymentReminderStage, 1, "reminder progress untouched");
  });

  it("does not re-cancel or re-notify an order a previous sweep already claimed", async (t) => {
    if (skip()) return t.skip();
    const orderId = await pendingOrder(minutesFromNow(-1));

    assert.equal(
      await svc.cancelPrePaymentOrder(orderId),
      true,
      "first caller wins the conditional status flip",
    );
    assert.equal(
      await svc.cancelPrePaymentOrder(orderId),
      false,
      "second caller loses it — so it skips the cancelled notifications",
    );
  });

  it("never cancels a paid order that raced the deadline", async (t) => {
    if (skip()) return t.skip();
    const orderId = await pendingOrder(minutesFromNow(-1));
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", paymentStatus: "PAID" },
    });

    await svc.runPrePaymentCancelSweep();

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(row.status, "PAID", "a payment landing at the deadline survives the sweep");
  });

  it("cancels the order's appointment too — no ghost booking on the calendar", async (t) => {
    if (skip()) return t.skip();
    // Manual bookings create the Appointment before payment, so a deadline
    // cancel that only touched the Order used to leave this row live on the
    // admin/doctor calendars. The Stripe session-expiry path cannot repair it
    // later — it only acts on orders that are still PENDING.
    const appointmentId = randomUUID();
    await prisma.appointment.create({
      data: {
        id: appointmentId,
        countryCode: "PT",
        consultationType: "GP",
        fullName: "Sweep Fixture",
        email: "sweep@test.local",
        consentAccepted: true,
        status: "REQUEST_RECEIVED",
        scheduledAt: minutesFromNow(90),
        amountCents: 5000,
        currencyCode: "EUR",
        paymentStatus: "UNPAID",
        manualEntry: true,
      },
    });
    createdAppointmentIds.push(appointmentId);

    const orderId = await pendingOrder(minutesFromNow(-1), 1, { appointmentIds: [appointmentId] });

    await svc.runPrePaymentCancelSweep();

    const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
    assert.equal(appt.status, "CANCELLED", "appointment is cancelled alongside its order");
    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(row.status, "CANCELLED");
  });

  it("reminder cron ignores past-due orders — the sweep owns them", async (t) => {
    if (skip()) return t.skip();
    const orderId = await pendingOrder(minutesFromNow(-1));

    await svc.runPrePaymentReminderCron();

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(
      row.status,
      "PENDING",
      "reminder cron no longer cancels — that moved to runPrePaymentCancelSweep",
    );
    assert.equal(row.prePaymentReminderStage, 1, "and it sends no reminder on the way out");
  });
});
