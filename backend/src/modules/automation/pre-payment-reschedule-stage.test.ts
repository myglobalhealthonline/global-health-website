import assert from "node:assert/strict";
import { join } from "node:path";
import { PrePaymentFlow } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// Same pattern as pre-payment-plan.test.ts: the service module pulls in
// config/env.js, which validates DATABASE_URL at import time. Nothing here
// touches the DB — prePaymentStageAfterReschedule is pure — but the env still
// has to parse, so load it before the dynamic import below.
loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * An unpaid order's reminder ladder is indexed in HOURS BEFORE THE
 * CONSULTATION (72/48/24/12/6), so moving the consultation rewrites which
 * rungs are still ahead of the patient. `recomputePrePaymentDueAt` used to
 * move only `paymentDueAt` and leave `prePaymentReminderStage` where the old
 * time had pushed it, so an order moved from "in 2 hours" out to three weeks
 * kept a spent ladder — and the reminder cron's `nextStage >= cancelStage`
 * guard then sent nothing at all before the new deadline.
 */
describe("prePaymentStageAfterReschedule", () => {
  let fn: typeof import("./pre-payment-flow.service.js")["prePaymentStageAfterReschedule"];
  const now = new Date("2026-09-12T10:00:00.000Z");
  const hoursOut = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

  before(async () => {
    ({ prePaymentStageAfterReschedule: fn } = await import("./pre-payment-flow.service.js"));
  });

  it("rewinds a spent ladder to stage 1 when the consultation moves weeks out", () => {
    // Was 2h away at the last reminder rung; now three weeks out.
    const target = fn({
      flow: PrePaymentFlow.OUTSIDE_48H,
      currentStage: 6,
      consultStart: hoursOut(24 * 21),
      now,
    });
    assert.equal(target, 1, "every rung is ahead of the patient again");
  });

  it("rewinds only to the rung the new lead time actually sits in", () => {
    // 30h out: the 72h and 48h rungs are due, 24h/12h/6h are still ahead.
    const target = fn({
      flow: PrePaymentFlow.OUTSIDE_48H,
      currentStage: 6,
      consultStart: hoursOut(30),
      now,
    });
    assert.equal(target, 3);
  });

  it("never fast-forwards when the consultation moves closer", () => {
    // Stage 2 sent, consultation pulled in to 3h — the cron catches the
    // remaining rungs up on its own tick; skipping them here would silently
    // swallow reminders the patient never received.
    const target = fn({
      flow: PrePaymentFlow.OUTSIDE_48H,
      currentStage: 2,
      consultStart: hoursOut(3),
      now,
    });
    assert.equal(target, null);
  });

  it("leaves a ladder that is already correctly positioned alone", () => {
    const target = fn({
      flow: PrePaymentFlow.OUTSIDE_48H,
      currentStage: 1,
      consultStart: hoursOut(24 * 21),
      now,
    });
    assert.equal(target, null, "already at the floor — nothing to write");
  });

  it("respects the shorter WITHIN_48H ladder", () => {
    // WITHIN_48H rungs are 24/12/6/2 → stages 2..5.
    const target = fn({
      flow: PrePaymentFlow.WITHIN_48H,
      currentStage: 5,
      consultStart: hoursOut(20),
      now,
    });
    assert.equal(target, 2, "only the 24h rung is due at 20h out");
  });

  it("leaves web checkout alone — its nudge is clock-based, not a ladder", () => {
    const target = fn({
      flow: PrePaymentFlow.WEB_CHECKOUT,
      currentStage: 3,
      consultStart: hoursOut(24 * 21),
      now,
    });
    assert.equal(target, null);
  });

  it("does nothing without a consultation start or once it is in the past", () => {
    assert.equal(
      fn({ flow: PrePaymentFlow.OUTSIDE_48H, currentStage: 5, consultStart: null, now }),
      null,
    );
    assert.equal(
      fn({
        flow: PrePaymentFlow.OUTSIDE_48H,
        currentStage: 5,
        consultStart: hoursOut(-2),
        now,
      }),
      null,
    );
  });
});
