import assert from "node:assert/strict";
import { join } from "node:path";
import { PrePaymentFlow } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// Same pattern as pre-payment-cancel-sweep.test.ts: the service module pulls in
// config/env.js, which validates DATABASE_URL at import time. Nothing here
// touches the DB — computePrePaymentPlan is pure — but the env still has to
// parse, so load it before the dynamic import below.
loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Regression test for ORD-000182: a consultation booked less than 5 minutes
 * before its slot was born past its own payment deadline.
 *
 * computePrePaymentPlan derived the urgent-booking deadline from the
 * CONSULTATION time (`consultAt - 5min`) with no floor relative to the BOOKING
 * time, so a slot booked 4m56s out produced a `paymentDueAt` 4 seconds in the
 * past. runPrePaymentCancelSweep (60s tick) then released the held slot while
 * the patient was still on the Stripe checkout page; the payment landed 1.4s
 * later, flipped the order to PAID, and found no slot left to mint an
 * appointment against. Charged €45, no consultation, no meeting link.
 */
describe("computePrePaymentPlan", () => {
  let computePrePaymentPlan: typeof import("./pre-payment-flow.service.js")["computePrePaymentPlan"];

  before(async () => {
    ({ computePrePaymentPlan } = await import("./pre-payment-flow.service.js"));
  });

  const bookedAt = new Date("2026-07-21T21:40:04.640Z");
  const minutesAfterBooking = (d: Date) => (d.getTime() - bookedAt.getTime()) / 60_000;

  it("never returns a deadline in the past for a last-minute booking", () => {
    // The exact ORD-000182 shape: slot starts at 21:45:00, booked at 21:40:04.
    const plan = computePrePaymentPlan({
      bookedAt,
      consultationStartAt: new Date("2026-07-21T21:45:00.000Z"),
    });

    assert.equal(plan.flow, PrePaymentFlow.WITHIN_48H);
    assert.ok(
      plan.paymentDueAt.getTime() > bookedAt.getTime(),
      `deadline ${plan.paymentDueAt.toISOString()} must be after the booking`,
    );
    assert.equal(minutesAfterBooking(plan.paymentDueAt), 10, "floored to the minimum pay window");
  });

  it("floors the deadline even when the consultation has already started", () => {
    const plan = computePrePaymentPlan({
      bookedAt,
      consultationStartAt: new Date("2026-07-21T21:35:00.000Z"),
    });

    assert.ok(
      plan.paymentDueAt.getTime() > bookedAt.getTime(),
      "a deadline the patient cannot meet is never acceptable",
    );
  });

  it("leaves an ordinary urgent booking on the 5-minute lead", () => {
    // 90 minutes out: consultAt - 5min is well past the floor, so the floor
    // must not bind and shorten the window.
    const consultationStartAt = new Date(bookedAt.getTime() + 90 * 60_000);
    const plan = computePrePaymentPlan({ bookedAt, consultationStartAt });

    assert.equal(plan.flow, PrePaymentFlow.WITHIN_48H);
    assert.equal(
      consultationStartAt.getTime() - plan.paymentDueAt.getTime(),
      5 * 60_000,
      "5 minutes before the consultation",
    );
  });

  it("leaves a same-day booking on the 1-hour lead", () => {
    const consultationStartAt = new Date(bookedAt.getTime() + 6 * 60 * 60_000);
    const plan = computePrePaymentPlan({ bookedAt, consultationStartAt });

    assert.equal(plan.flow, PrePaymentFlow.WITHIN_48H);
    assert.equal(
      consultationStartAt.getTime() - plan.paymentDueAt.getTime(),
      60 * 60_000,
      "1 hour before the consultation",
    );
  });

  it("leaves an advance booking on the 24-hour lead", () => {
    const consultationStartAt = new Date(bookedAt.getTime() + 5 * 24 * 60 * 60_000);
    const plan = computePrePaymentPlan({ bookedAt, consultationStartAt });

    assert.equal(plan.flow, PrePaymentFlow.OUTSIDE_48H);
    assert.equal(
      consultationStartAt.getTime() - plan.paymentDueAt.getTime(),
      24 * 60 * 60_000,
      "24 hours before the consultation",
    );
  });

  it("falls back to a fixed window when there is no consultation time", () => {
    const plan = computePrePaymentPlan({ bookedAt, consultationStartAt: null });

    assert.equal(plan.flow, PrePaymentFlow.OUTSIDE_48H);
    assert.equal(minutesAfterBooking(plan.paymentDueAt), 24 * 60);
  });

  describe("website self-serve checkout", () => {
    it("gives a flat 15-minute window regardless of how far out the slot is", () => {
      for (const hoursOut of [6, 30, 24 * 5]) {
        const plan = computePrePaymentPlan({
          bookedAt,
          consultationStartAt: new Date(bookedAt.getTime() + hoursOut * 60 * 60_000),
          webCheckout: true,
        });

        assert.equal(plan.flow, PrePaymentFlow.WEB_CHECKOUT, `${hoursOut}h out`);
        assert.equal(minutesAfterBooking(plan.paymentDueAt), 15, `${hoursOut}h out`);
      }
    });

    it("still applies the 15-minute window when there is no consultation time", () => {
      const plan = computePrePaymentPlan({
        bookedAt,
        consultationStartAt: null,
        webCheckout: true,
      });

      assert.equal(plan.flow, PrePaymentFlow.WEB_CHECKOUT);
      assert.equal(minutesAfterBooking(plan.paymentDueAt), 15);
    });

    it("never holds the slot longer than the normal rules would", () => {
      // Slot 8 minutes out: the standard urgent rule floors at booking+10min,
      // which is earlier than booking+15min, so it wins. A website order must
      // not sit unpaid well past its own consultation.
      const plan = computePrePaymentPlan({
        bookedAt,
        consultationStartAt: new Date(bookedAt.getTime() + 8 * 60_000),
        webCheckout: true,
      });

      assert.equal(plan.flow, PrePaymentFlow.WEB_CHECKOUT);
      assert.equal(minutesAfterBooking(plan.paymentDueAt), 10);
    });

    it("leaves every other caller on the old ladder", () => {
      // Regression guard: the web flow is opt-in, so manual/doctor-portal/
      // insurance bookings must produce byte-identical plans to before.
      const consultationStartAt = new Date(bookedAt.getTime() + 30 * 60 * 60_000);
      const omitted = computePrePaymentPlan({ bookedAt, consultationStartAt });
      const explicitFalse = computePrePaymentPlan({
        bookedAt,
        consultationStartAt,
        webCheckout: false,
      });

      assert.equal(omitted.flow, PrePaymentFlow.WITHIN_48H);
      assert.deepEqual(explicitFalse, omitted);
    });
  });
});
