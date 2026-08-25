import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { isSettledCheckoutSession } from "./checkout-session-settlement.js";

describe("checkout session settlement gate", () => {
  it("settles a card checkout (completed + paid)", () => {
    assert.equal(
      isSettledCheckoutSession({
        eventType: "checkout.session.completed",
        paymentStatus: "paid",
      }),
      true,
    );
  });

  it("does NOT settle a Multibanco voucher (completed + unpaid)", () => {
    // The regression case: a PT patient selects Multibanco, Stripe prints the
    // Entidade/Referência pair and completes the session with no money moved.
    // Treating this as payment sent a booking confirmation (and a PT fiscal
    // invoice) for a payment that had not happened.
    assert.equal(
      isSettledCheckoutSession({
        eventType: "checkout.session.completed",
        paymentStatus: "unpaid",
      }),
      false,
    );
  });

  it("settles when the bank later confirms the voucher", () => {
    assert.equal(
      isSettledCheckoutSession({
        eventType: "checkout.session.async_payment_succeeded",
        paymentStatus: "paid",
      }),
      true,
    );
  });

  it("settles async_payment_succeeded even if payment_status lags", () => {
    // Stripe fires this event only after the bank confirms; the session's own
    // payment_status has been observed lagging behind it. Gating on the status
    // here would strand a real payment as PENDING.
    assert.equal(
      isSettledCheckoutSession({
        eventType: "checkout.session.async_payment_succeeded",
        paymentStatus: "unpaid",
      }),
      true,
    );
  });

  it("settles a €0 session (no_payment_required)", () => {
    assert.equal(
      isSettledCheckoutSession({
        eventType: "checkout.session.completed",
        paymentStatus: "no_payment_required",
      }),
      true,
    );
  });

  it("holds when payment_status is missing or unrecognised", () => {
    // Fail closed: an unknown status must never confirm a booking.
    assert.equal(
      isSettledCheckoutSession({ eventType: "checkout.session.completed" }),
      false,
    );
    assert.equal(
      isSettledCheckoutSession({
        eventType: "checkout.session.completed",
        paymentStatus: "processing",
      }),
      false,
    );
  });
});
