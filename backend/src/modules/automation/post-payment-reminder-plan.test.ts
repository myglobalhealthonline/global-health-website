import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  planPostPaymentReminder,
  POST_PAYMENT_STAGE_MEETING_LINK,
  POST_PAYMENT_STAGE_ONE_HOUR,
  POST_PAYMENT_STAGE_PAID,
} from "./post-payment-flow.service.js";

const MIN = 60_000;
const plan = (stage: number, leadMinutes: number, hasAttendance = true) =>
  planPostPaymentReminder({ stage, leadMs: leadMinutes * MIN, hasAttendance });

describe("post-payment reminder ladder", () => {
  it("sends the meeting link first, whatever the lead time", () => {
    assert.equal(plan(POST_PAYMENT_STAGE_PAID, 240).sendMeetingLink, true);
    assert.equal(plan(POST_PAYMENT_STAGE_PAID, 2).sendMeetingLink, true);
  });

  it("does nothing at all without somewhere to attend", () => {
    const p = plan(POST_PAYMENT_STAGE_PAID, 30, false);
    assert.deepEqual(p, {
      sendMeetingLink: false,
      sendOneHour: false,
      advanceToOneHourSilently: false,
      sendFiveMinute: false,
    });
  });

  it("holds the 1-hour rung until lead time reaches the ceiling", () => {
    assert.equal(plan(POST_PAYMENT_STAGE_MEETING_LINK, 120).sendOneHour, false);
    assert.equal(plan(POST_PAYMENT_STAGE_MEETING_LINK, 64).sendOneHour, true);
  });

  it("still fires the 1-hour rung on a tick delayed past the old window", () => {
    // The old [55, 65] window would have been walked straight past here.
    assert.equal(plan(POST_PAYMENT_STAGE_MEETING_LINK, 20).sendOneHour, true);
  });

  it("fires the 5-minute rung once its own ceiling is reached", () => {
    assert.equal(plan(POST_PAYMENT_STAGE_ONE_HOUR, 30).sendFiveMinute, false);
    assert.equal(plan(POST_PAYMENT_STAGE_ONE_HOUR, 5).sendFiveMinute, true);
  });

  /**
   * The regression this file exists for. A short-notice booking is still at
   * MEETING_LINK when lead time is already inside 5-minute territory: the
   * "1 hour" message is a lie and must be skipped, but the STAGE still has to
   * advance in the database, because `post_sendFiveMinuteReminder` gates on
   * `postPaymentStage >= ONE_HOUR`. Advancing only a local variable meant the
   * patient got neither reminder and the order stalled at MEETING_LINK.
   */
  it("skips the 1-hour message but still advances the stage, then sends the 5-minute", () => {
    const p = plan(POST_PAYMENT_STAGE_MEETING_LINK, 3);
    assert.equal(p.sendOneHour, false, "a '1 hour' message 3 minutes out is a lie");
    assert.equal(p.advanceToOneHourSilently, true, "the DB stage must still move");
    assert.equal(p.sendFiveMinute, true, "and the patient must get the 5-minute one");
  });

  it("does the same for a consultation that has just started", () => {
    const p = plan(POST_PAYMENT_STAGE_MEETING_LINK, -2);
    assert.equal(p.advanceToOneHourSilently, true);
    assert.equal(p.sendFiveMinute, true);
  });

  it("never advances or sends once the consultation is long past", () => {
    const p = plan(POST_PAYMENT_STAGE_MEETING_LINK, -90);
    assert.equal(p.sendOneHour, false);
    assert.equal(p.advanceToOneHourSilently, false);
    assert.equal(p.sendFiveMinute, false);
  });

  it("never both sends and silently advances the same rung", () => {
    for (let lead = -70; lead <= 130; lead += 1) {
      const p = plan(POST_PAYMENT_STAGE_MEETING_LINK, lead);
      assert.equal(
        p.sendOneHour && p.advanceToOneHourSilently,
        false,
        `lead ${lead}m sent and skipped the same rung`,
      );
    }
  });

  it("leaves an order at MEETING_LINK only while the 1-hour rung is genuinely not due", () => {
    for (let lead = -60; lead <= 200; lead += 1) {
      const p = plan(POST_PAYMENT_STAGE_MEETING_LINK, lead);
      const movesOn = p.sendOneHour || p.advanceToOneHourSilently;
      // Inside the ceiling the ladder must always move; outside it must not.
      assert.equal(movesOn, lead <= 65, `lead ${lead}m`);
    }
  });
});
