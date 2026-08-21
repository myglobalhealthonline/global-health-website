import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PrePaymentFlow } from "@prisma/client";
import { rescheduledPaymentDueAt } from "./pre-payment-flow.service.js";

/**
 * Regression cover for ORD-000382 (2026-08-21): a Spain manual booking made for
 * 13:59 kept its 12:59 payment deadline after admin moved the consultation to
 * 08:30, so the order was still "awaiting payment" while the slot came and
 * went, and the doctor-no-show cron nudged the doctor about it.
 */
describe("payment deadline follows a rescheduled consultation", () => {
  const bookedAt = new Date("2026-08-20T12:27:00.000Z");

  it("re-anchors to the new start when the consultation moves earlier", () => {
    const due = rescheduledPaymentDueAt({
      flow: PrePaymentFlow.WITHIN_48H,
      bookedAt,
      consultStart: new Date("2026-08-21T08:30:00.000Z"),
      now: new Date("2026-08-20T12:37:00.000Z"),
    });
    // WITHIN_48H pays 1h before the consultation — the real incident's deadline
    // of 12:59 (anchored to the abandoned 13:59 slot) is gone.
    assert.equal(due.toISOString(), "2026-08-21T07:30:00.000Z");
  });

  it("never leaves the deadline past the consultation start", () => {
    const consultStart = new Date("2026-08-21T08:30:00.000Z");
    const due = rescheduledPaymentDueAt({
      flow: PrePaymentFlow.WITHIN_48H,
      bookedAt,
      consultStart,
      now: new Date("2026-08-21T08:00:00.000Z"),
    });
    assert.ok(
      due.getTime() <= consultStart.getTime(),
      `deadline ${due.toISOString()} must not be after the consultation`,
    );
  });

  it("moving a slot to minutes away caps at the start, not after it", () => {
    const now = new Date("2026-08-21T09:00:00.000Z");
    const consultStart = new Date("2026-08-21T09:02:00.000Z");
    const due = rescheduledPaymentDueAt({
      flow: PrePaymentFlow.WITHIN_48H,
      bookedAt,
      consultStart,
      now,
    });
    // The 10-minute floor would land after the consultation, so the cap wins.
    assert.equal(due.toISOString(), consultStart.toISOString());
  });

  it("gives the patient a floor when the recomputed deadline is already past", () => {
    const now = new Date("2026-08-21T06:00:00.000Z");
    const due = rescheduledPaymentDueAt({
      flow: PrePaymentFlow.WITHIN_48H,
      bookedAt,
      // 1h-before would land at 05:50 — behind us already.
      consultStart: new Date("2026-08-21T06:50:00.000Z"),
      now,
    });
    assert.ok(due.getTime() >= now.getTime(), "deadline must not be in the past");
    assert.equal(due.toISOString(), "2026-08-21T06:10:00.000Z");
  });

  it("uses the lead time the NEW gap earns, while the stored flow is left alone", () => {
    // Booked >48h out (OUTSIDE_48H ladder, 24h-before deadline), then moved to
    // ~31h after booking. The deadline follows the new gap (1h before), but the
    // caller keeps `prePaymentFlow` as-is so the reminder stage numbering that
    // has already been used stays meaningful.
    const due = rescheduledPaymentDueAt({
      flow: PrePaymentFlow.OUTSIDE_48H,
      bookedAt,
      consultStart: new Date("2026-08-21T20:00:00.000Z"),
      now: new Date("2026-08-20T12:37:00.000Z"),
    });
    assert.equal(due.toISOString(), "2026-08-21T19:00:00.000Z");
  });
});
