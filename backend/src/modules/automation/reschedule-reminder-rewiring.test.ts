import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * A rescheduled consultation has to drag BOTH reminder ladders with it, and
 * which one applies depends on whether the order is paid:
 *
 *   unpaid → the pre-payment ladder (payment reminders, rungs in hours before
 *            the consultation) plus the payment deadline itself
 *   paid   → the post-payment ladder (consultation reminders for patient and
 *            doctor)
 *
 * Each ladder must be a no-op on the other's orders, or a reschedule would
 * either nag a patient who has already paid or re-arm consultation reminders
 * for a booking nobody has paid for.
 *
 * Fully mocked — zero DB (needs `--experimental-test-module-mocks`).
 */

type OrderRow = Record<string, unknown> | null;

const state: {
  order: OrderRow;
  updates: Record<string, unknown>[];
  runs: Record<string, unknown>[];
} = { order: null, updates: [], runs: [] };

let prePay: typeof import("./pre-payment-flow.service.js");
let postPay: typeof import("./post-payment-flow.service.js");

const ORDER_ID = "order-1";
const NOW = new Date("2026-09-12T10:00:00.000Z");
const hoursOut = (h: number) => new Date(NOW.getTime() + h * 60 * 60 * 1000);

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        order: {
          findUnique: async () => state.order,
          update: async ({ data }: { data: Record<string, unknown> }) => {
            state.updates.push(data);
            return { ...(state.order ?? {}), ...data };
          },
        },
        orderItem: { findFirst: async () => ({ orderId: ORDER_ID }) },
      },
    },
  });
  mock.module("./automation-run.service.js", {
    namedExports: {
      createAutomationRun: async (run: Record<string, unknown>) => {
        state.runs.push(run);
        return { id: "run-1" };
      },
      finishAutomationRun: async () => undefined,
    },
  });
  prePay = await import("./pre-payment-flow.service.js");
  postPay = await import("./post-payment-flow.service.js");
});

beforeEach(() => {
  state.order = null;
  state.updates = [];
  state.runs = [];
});

describe("reschedule → UNPAID order: payment reminders re-wired", () => {
  const unpaidOrder = (over: Record<string, unknown> = {}) => ({
    id: ORDER_ID,
    status: "PENDING",
    paymentStatus: "UNPAID",
    prePaymentFlow: "OUTSIDE_48H",
    // Deadline + ladder both anchored to the OLD time (2h out).
    paymentDueAt: hoursOut(1),
    createdAt: new Date("2026-09-10T09:00:00.000Z"),
    prePaymentReminderStage: 6,
    ...over,
  });

  it("moves the payment deadline onto the new consultation time", async () => {
    state.order = unpaidOrder();
    const newStart = hoursOut(24 * 21);

    const due = await prePay.recomputePrePaymentDueAt(ORDER_ID, newStart, NOW);

    assert.ok(due, "a new deadline is returned");
    assert.ok(
      due.getTime() > NOW.getTime(),
      "the deadline is no longer in the past relative to the move",
    );
    const dueWrite = state.updates.find((u) => "paymentDueAt" in u);
    assert.ok(dueWrite, "paymentDueAt was written");
  });

  it("rewinds the spent reminder ladder so the patient is warned again", async () => {
    state.order = unpaidOrder();

    await prePay.recomputePrePaymentDueAt(ORDER_ID, hoursOut(24 * 21), NOW);

    const stageWrite = state.updates.find((u) => "prePaymentReminderStage" in u);
    assert.ok(stageWrite, "the ladder marker was rewritten");
    assert.equal(
      stageWrite.prePaymentReminderStage,
      1,
      "back to the floor — every rung is ahead of the patient again",
    );
    const rearmRun = state.runs.find(
      (r) => r.automationKey === "pre_payment_reminders_rearmed",
    );
    assert.ok(rearmRun, "the rewind is recorded for observability");
  });

  it("rewinds only to the rung the new lead time sits in", async () => {
    state.order = unpaidOrder();

    // 30h out: the 72h and 48h rungs are due; 24h/12h/6h are still ahead.
    await prePay.recomputePrePaymentDueAt(ORDER_ID, hoursOut(30), NOW);

    const stageWrite = state.updates.find((u) => "prePaymentReminderStage" in u);
    assert.equal(stageWrite?.prePaymentReminderStage, 3);
  });

  it("never fast-forwards the ladder when the consultation is pulled closer", async () => {
    state.order = unpaidOrder({ prePaymentReminderStage: 2 });

    await prePay.recomputePrePaymentDueAt(ORDER_ID, hoursOut(3), NOW);

    assert.equal(
      state.updates.find((u) => "prePaymentReminderStage" in u),
      undefined,
      "rungs the patient never received must not be silently swallowed",
    );
  });

  it("leaves a PAID order's deadline and ladder untouched", async () => {
    state.order = unpaidOrder({ paymentStatus: "PAID", status: "PAID" });

    const due = await prePay.recomputePrePaymentDueAt(ORDER_ID, hoursOut(24 * 21), NOW);

    assert.equal(due, null, "nothing to re-anchor once it is paid");
    assert.deepEqual(state.updates, [], "no writes at all");
  });

  it("leaves a cancelled order alone", async () => {
    state.order = unpaidOrder({ status: "CANCELLED" });

    const due = await prePay.recomputePrePaymentDueAt(ORDER_ID, hoursOut(48), NOW);

    assert.equal(due, null);
    assert.deepEqual(state.updates, []);
  });
});

describe("reschedule → PAID order: consultation reminders re-wired", () => {
  const paidOrder = (over: Record<string, unknown> = {}) => ({
    id: ORDER_ID,
    paymentStatus: "PAID",
    // Ladder spent against the OLD time: the meeting-link and 1-hour rungs
    // have both already gone out.
    postPaymentStage: 4,
    ...over,
  });

  it("rewinds the ladder so patient + doctor reminders fire against the new time", async () => {
    state.order = paidOrder();

    await postPay.rearmPostPaymentRemindersForReschedule(ORDER_ID, hoursOut(24 * 21));

    const stageWrite = state.updates.find((u) => "postPaymentStage" in u);
    assert.ok(stageWrite, "the ladder marker was rewritten");
    assert.ok(
      (stageWrite.postPaymentStage as number) < 4,
      "rewound below the spent stage so the remaining rungs re-fire",
    );
    const rearmRun = state.runs.find(
      (r) => r.automationKey === "post_payment_reminders_rearmed",
    );
    assert.ok(rearmRun, "the rewind is recorded for observability");
  });

  it("is a no-op for an UNPAID order — that ladder has not started", async () => {
    state.order = paidOrder({ paymentStatus: "UNPAID" });

    await postPay.rearmPostPaymentRemindersForReschedule(ORDER_ID, hoursOut(24 * 21));

    assert.deepEqual(state.updates, []);
  });

  it("does not re-arm once the new time is already in the past", async () => {
    state.order = paidOrder();

    await postPay.rearmPostPaymentRemindersForReschedule(ORDER_ID, hoursOut(-2));

    assert.deepEqual(state.updates, [], "nothing left to remind anyone about");
  });
});
