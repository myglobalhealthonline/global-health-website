import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * A rescheduled consultation has to drag its whole tail with it, and the three
 * reschedule paths (admin order page, doctor workspace, patient self-service)
 * used to carry different subsets of that tail — the patient path carried
 * none, so a self-service move left the old Meet link live, the reminder
 * ladder pinned to the old time, and nobody told.
 *
 * Fully mocked — zero DB, Google or WhatsApp contact (needs
 * `--experimental-test-module-mocks`).
 */

type Row = Record<string, unknown> | null;

const state: {
  appointment: Row;
  orderItem: Row;
  meetOk: boolean;
  meetCalls: { orderId: string; forceRegenerate?: boolean; skipSideEffects?: boolean }[];
  rearmCalls: { orderId: string; start: Date | null }[];
  dueAtCalls: { orderId: string; start: Date | null }[];
  notifyCalls: Record<string, unknown>[];
  notifyThrows: boolean;
} = {
  appointment: null,
  orderItem: null,
  meetOk: true,
  meetCalls: [],
  rearmCalls: [],
  dueAtCalls: [],
  notifyCalls: [],
  notifyThrows: false,
};

let svc: typeof import("./reschedule-side-effects.service.js");

const APPT_ID = "appt-1";
const ORDER_ID = "order-1";
const NEW_START = new Date("2026-08-27T14:00:00.000Z");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        appointment: { findUnique: async () => state.appointment },
        orderItem: { findFirst: async () => state.orderItem },
      },
    },
  });
  mock.module("../admin-orders/generate-order-meet-link.service.js", {
    namedExports: {
      orderIsPaidForMeet: (order: { paymentStatus: string }) =>
        order.paymentStatus === "PAID",
      generateOrderMeetLink: async (
        orderId: string,
        options: { forceRegenerate?: boolean; skipSideEffects?: boolean },
      ) => {
        state.meetCalls.push({ orderId, ...options });
        return state.meetOk
          ? { ok: true, meetLink: "https://meet.example/new", serviceTitle: "x" }
          : { ok: false, code: "NOT_CONFIGURED", message: "no" };
      },
    },
  });
  mock.module("../automation/pre-payment-flow.service.js", {
    namedExports: {
      recomputePrePaymentDueAt: async (orderId: string, start: Date | null) => {
        state.dueAtCalls.push({ orderId, start });
      },
    },
  });
  mock.module("../automation/post-payment-flow.service.js", {
    namedExports: {
      rearmPostPaymentRemindersForReschedule: async (
        orderId: string,
        start: Date | null,
      ) => {
        state.rearmCalls.push({ orderId, start });
      },
    },
  });
  mock.module("../automation/appointment-update-notifications.service.js", {
    namedExports: {
      sendAppointmentUpdateNotifications: async (
        input: Record<string, unknown>,
      ) => {
        if (state.notifyThrows) throw new Error("whatsapp down");
        state.notifyCalls.push(input);
        return { sent: true };
      },
    },
  });
  svc = await import("./reschedule-side-effects.service.js");
});

beforeEach(() => {
  state.appointment = {
    id: APPT_ID,
    scheduledAt: NEW_START,
    consultationMode: "ONLINE",
    meetingUrl: "https://meet.example/old",
    doctorId: "doc-1",
  };
  state.orderItem = {
    orderId: ORDER_ID,
    order: {
      id: ORDER_ID,
      paymentStatus: "PAID",
      status: "PAID",
      meetingUrl: "https://meet.example/old",
    },
  };
  state.meetOk = true;
  state.meetCalls = [];
  state.rearmCalls = [];
  state.dueAtCalls = [];
  state.notifyCalls = [];
  state.notifyThrows = false;
});

describe("applyRescheduleSideEffects", () => {
  it("reissues the Meet link and hands it to the notification", async () => {
    const result = await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      scheduledAt: NEW_START,
      timeChanged: true,
      changeReason: "",
    });

    assert.equal(result.meetRegenerated, true);
    assert.equal(result.meetingUrl, "https://meet.example/new");
    assert.deepEqual(state.meetCalls, [
      { orderId: ORDER_ID, forceRegenerate: true, skipSideEffects: true },
    ]);
    // The old link belongs to a calendar event at the old time — the patient
    // must be told the new one, not the stale order-level value.
    assert.equal(state.notifyCalls[0].meetingUrl, "https://meet.example/new");
    assert.equal(result.notificationsSent, true);
  });

  it("moves the payment deadline and re-arms the reminder ladder on the new time", async () => {
    await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      scheduledAt: NEW_START,
      timeChanged: true,
      changeReason: "",
    });

    assert.deepEqual(state.dueAtCalls, [{ orderId: ORDER_ID, start: NEW_START }]);
    assert.deepEqual(state.rearmCalls, [{ orderId: ORDER_ID, start: NEW_START }]);
  });

  it("defaults the doctor ids to the assigned doctor so a time-only move still notifies them", async () => {
    await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      timeChanged: true,
      changeReason: "",
    });

    // Both sides equal => "unchanged", which is what makes the notification
    // service send the time-only update instead of a reassignment.
    assert.equal(state.notifyCalls[0].previousDoctorId, "doc-1");
    assert.equal(state.notifyCalls[0].newDoctorId, "doc-1");
  });

  it("keeps the old link and still notifies when Meet regeneration fails", async () => {
    state.meetOk = false;

    const result = await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      scheduledAt: NEW_START,
      timeChanged: true,
      changeReason: "",
    });

    assert.equal(result.meetRegenerated, false);
    assert.equal(result.meetingUrl, "https://meet.example/old");
    assert.equal(state.notifyCalls.length, 1);
  });

  it("does not reissue a link for an in-person consultation", async () => {
    state.appointment = {
      ...(state.appointment as object),
      consultationMode: "IN_PERSON",
    };

    const result = await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      scheduledAt: NEW_START,
      timeChanged: true,
      changeReason: "",
    });

    assert.deepEqual(state.meetCalls, []);
    assert.equal(result.meetRegenerated, false);
    assert.equal(state.notifyCalls.length, 1);
  });

  it("does not reissue a link for an unpaid order", async () => {
    state.orderItem = {
      orderId: ORDER_ID,
      order: {
        id: ORDER_ID,
        paymentStatus: "PENDING",
        status: "PENDING",
        meetingUrl: null,
      },
    };

    await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      scheduledAt: NEW_START,
      timeChanged: true,
      changeReason: "",
    });

    assert.deepEqual(state.meetCalls, []);
    // The unpaid ladder still has to follow the consultation.
    assert.equal(state.dueAtCalls.length, 1);
  });

  it("no-ops on an appointment with no order behind it", async () => {
    state.orderItem = null;

    const result = await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      scheduledAt: NEW_START,
      timeChanged: true,
      changeReason: "",
    });

    assert.deepEqual(result, {
      orderId: null,
      meetingUrl: "https://meet.example/old",
      meetRegenerated: false,
      notificationsSent: false,
    });
    assert.deepEqual(state.meetCalls, []);
    assert.deepEqual(state.rearmCalls, []);
    assert.deepEqual(state.notifyCalls, []);
  });

  it("survives a notification failure — the move is already committed", async () => {
    state.notifyThrows = true;

    const result = await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      scheduledAt: NEW_START,
      timeChanged: true,
      changeReason: "",
    });

    assert.equal(result.notificationsSent, false);
    assert.equal(result.meetRegenerated, true);
  });

  it("still reissues the link when only the doctor changed", async () => {
    await svc.applyRescheduleSideEffects({
      appointmentId: APPT_ID,
      timeChanged: false,
      doctorChanged: true,
      changeReason: "Doctor unavailable",
      previousDoctorId: "doc-1",
      newDoctorId: "doc-2",
    });

    assert.equal(state.meetCalls.length, 1);
    // Time didn't move, so nothing downstream of the clock should be touched.
    assert.deepEqual(state.dueAtCalls, []);
    assert.deepEqual(state.rearmCalls, []);
    assert.equal(state.notifyCalls[0].changeReason, "Doctor unavailable");
  });
});
