import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  postPaymentStageAfterReschedule,
  POST_PAYMENT_STAGE_PAID,
  POST_PAYMENT_STAGE_MEETING_LINK,
  POST_PAYMENT_STAGE_ONE_HOUR,
  POST_PAYMENT_STAGE_SESSION_START,
} from "./post-payment-flow.service.js";

/**
 * A rescheduled patient got no 1-hour reminder for the new time: the reminder
 * ladder is gated on `Order.postPaymentStage`, which only ever moves forward,
 * so an order that had already sent (or passed) its 1-hour rung stayed there
 * while the consultation moved hours later. Rewinding the stage on reschedule
 * is what re-arms the cron.
 */
describe("reminder ladder re-arms on a rescheduled consultation", () => {
  const now = new Date("2026-08-26T09:00:00.000Z");

  it("rewinds a sent 1-hour reminder when the new time is hours away", () => {
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_ONE_HOUR,
        consultStart: new Date("2026-08-26T15:00:00.000Z"),
        now,
      }),
      POST_PAYMENT_STAGE_MEETING_LINK,
    );
  });

  it("rewinds an order that already reached the 5-minute rung", () => {
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_SESSION_START,
        consultStart: new Date("2026-08-27T10:00:00.000Z"),
        now,
      }),
      POST_PAYMENT_STAGE_MEETING_LINK,
    );
  });

  it("keeps only the 5-minute rung when the new time is inside the 1-hour window", () => {
    // 09:40 is 40 min out — the cron's 55-65 min window is already behind us,
    // so re-arming the 1-hour reminder would just never fire.
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_SESSION_START,
        consultStart: new Date("2026-08-26T09:40:00.000Z"),
        now,
      }),
      POST_PAYMENT_STAGE_ONE_HOUR,
    );
  });

  it("re-arms the 1-hour reminder just outside the cron window", () => {
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_SESSION_START,
        consultStart: new Date("2026-08-26T10:06:00.000Z"),
        now,
      }),
      POST_PAYMENT_STAGE_MEETING_LINK,
    );
  });

  it("leaves an order whose ladder has not passed the meeting link alone", () => {
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_MEETING_LINK,
        consultStart: new Date("2026-08-26T15:00:00.000Z"),
        now,
      }),
      null,
    );
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_PAID,
        consultStart: new Date("2026-08-26T15:00:00.000Z"),
        now,
      }),
      null,
    );
  });

  it("never re-arms for a start that is already past", () => {
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_SESSION_START,
        consultStart: new Date("2026-08-26T08:30:00.000Z"),
        now,
      }),
      null,
    );
  });

  it("does nothing when the new start cannot be resolved", () => {
    assert.equal(
      postPaymentStageAfterReschedule({
        currentStage: POST_PAYMENT_STAGE_SESSION_START,
        consultStart: null,
        now,
      }),
      null,
    );
  });
});
