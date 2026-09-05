import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * WF-1 — cross-border prescription finalisation must never complete a
 * terminal async consultation.
 *
 * The original `onCrossBorderRxPrescriptionFinalised` (now split into
 * `finaliseCrossBorderRxInTransaction` + `notifyCrossBorderRxFinalised`)
 * wrote `status: "COMPLETED"` with no
 * reference to the appointment's current status; its `.catch()` fallback then
 * discarded even the `consultationCompletedAt: null` condition and re-wrote
 * COMPLETED unconditionally, and a final `.catch(() => {})` swallowed the
 * failure so the patient/doctor "sent to pharmacy" notifications fired
 * regardless. A cancelled consultation could therefore be completed —
 * counting toward payout, reopening the chat lock window and, via
 * `doctorHasTreatmentRelationship` (which excludes only CANCELLED),
 * re-establishing PHI access.
 *
 * Fully mocked — zero DB / email / WhatsApp contact (needs
 * `--experimental-test-module-mocks`).
 */

type Row = Record<string, unknown> | null;

const state: {
  request: Row;
  appointment: Row;
  sourceAppointment: Row;
  /** Rows the conditional appointment completion reports as matched. */
  apptUpdateManyCount: number;
  /** Rows the request finalise claim reports as matched. */
  claimCount: number;
  apptUpdateCalls: Record<string, unknown>[];
  apptUpdateManyCalls: Record<string, unknown>[];
  claimCalls: Record<string, unknown>[];
  rolledBack: boolean;
  notifyDoctorCalls: unknown[][];
  notifyUserCalls: unknown[][];
  notifyRequestingDoctorCalls: unknown[][];
  notifyPatientAcceptedCalls: unknown[][];
} = {
  request: null,
  appointment: null,
  sourceAppointment: null,
  apptUpdateManyCount: 1,
  claimCount: 1,
  apptUpdateCalls: [],
  apptUpdateManyCalls: [],
  claimCalls: [],
  rolledBack: false,
  notifyDoctorCalls: [],
  notifyUserCalls: [],
  notifyRequestingDoctorCalls: [],
  notifyPatientAcceptedCalls: [],
};

let svc: typeof import("./cross-border-rx.service.js");
let prismaMock: { $transaction: (fn: (tx: never) => Promise<unknown>) => Promise<unknown> };

const ASYNC_APPT_ID = "async-appt-1";
const REQUEST_ID = "cbr-1";

function openRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    sourceDoctorId: "doc-a",
    sourceAppointmentId: "src-appt-1",
    patientEmail: "ana@example.com",
    patientFullName: "Ana Silva",
    targetCountryCode: "PT",
    ...overrides,
  };
}

before(async () => {
  // The claim + completion run inside one `$transaction`; the fake replays the
  // callback against the same delegates and records whether it rolled back, so
  // a rejected completion must undo the request claim.
  const prisma: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const before = state.claimCalls.length;
      try {
        return await fn(prisma);
      } catch (error) {
        state.claimCalls.length = before; // rolled back
        state.rolledBack = true;
        throw error;
      }
    },
  };
  Object.assign(prisma, {
    crossBorderPrescriptionRequest: {
      findFirst: async () => state.request,
      updateMany: async (args: Record<string, unknown>) => {
        state.claimCalls.push(args);
        return { count: state.claimCount };
      },
    },
    appointment: {
      findUnique: async (args: { where: { id: string } }) =>
        args.where.id === ASYNC_APPT_ID ? state.appointment : state.sourceAppointment,
      findFirst: async () => state.appointment,
      update: async (args: Record<string, unknown>) => {
        state.apptUpdateCalls.push(args);
        return { id: ASYNC_APPT_ID };
      },
      updateMany: async (args: Record<string, unknown>) => {
        state.apptUpdateManyCalls.push(args);
        return { count: state.apptUpdateManyCount };
      },
    },
    user: { findFirst: async () => ({ id: "user-1" }) },
  });
  prismaMock = prisma as unknown as typeof prismaMock;
  mock.module("../../db/prisma.js", { namedExports: { prisma } });
  mock.module("../notifications/notify.service.js", {
    namedExports: {
      notifyDoctor: async (...args: unknown[]) => {
        state.notifyDoctorCalls.push(args);
      },
      notifyUser: async (...args: unknown[]) => {
        state.notifyUserCalls.push(args);
      },
      notifyAdmins: async () => {},
    },
  });
  mock.module("./cross-border-rx-notifications.service.js", {
    namedExports: {
      notifyPatientCrossBorderConsent: async () => {},
      notifyPatientCrossBorderPayment: async () => {},
      notifyPatientCrossBorderAccepted: async (...args: unknown[]) => {
        state.notifyPatientAcceptedCalls.push(args);
      },
      notifyRequestingDoctorFinalised: async (...args: unknown[]) => {
        state.notifyRequestingDoctorCalls.push(args);
      },
      notifyStaffCrossBorderRequest: async () => {},
      notifySourceDoctorMoreInfoRequested: async () => {},
      notifyTargetDoctorMoreInfoAnswered: async () => {},
    },
  });
  svc = await import("./cross-border-rx.service.js");
});

beforeEach(() => {
  state.request = openRequest();
  state.appointment = { id: ASYNC_APPT_ID, status: "REQUEST_RECEIVED" };
  state.sourceAppointment = { phone: null, whatsappConsent: false, countryCode: "PT" };
  state.apptUpdateManyCount = 1;
  state.claimCount = 1;
  state.apptUpdateCalls = [];
  state.apptUpdateManyCalls = [];
  state.claimCalls = [];
  state.rolledBack = false;
  state.notifyDoctorCalls = [];
  state.notifyUserCalls = [];
  state.notifyRequestingDoctorCalls = [];
  state.notifyPatientAcceptedCalls = [];
});

/** Every appointment write this flow could issue, whichever verb it uses. */
function apptWrites() {
  return [...state.apptUpdateCalls, ...state.apptUpdateManyCalls];
}

function completionNotifications() {
  return [
    ...state.notifyDoctorCalls,
    ...state.notifyUserCalls,
    ...state.notifyRequestingDoctorCalls,
    ...state.notifyPatientAcceptedCalls,
  ];
}

/** Let the `void`-ed notification tails settle. */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mirrors what `finalizeGeneratedDocument` does around the DB half: run the
 * cross-border writes inside one transaction, then — only if it committed —
 * send the notifications. Keeps these unit cases pinned to the same ordering
 * the real caller uses; the full route path is covered by
 * `src/routes/doctor-generated-documents.cross-border-finalize.test.ts`.
 */
async function runFinalise(appointmentId: string): Promise<void> {
  const context = (await prismaMock.$transaction((tx) =>
    svc.finaliseCrossBorderRxInTransaction(tx, appointmentId),
  )) as Awaited<ReturnType<typeof svc.finaliseCrossBorderRxInTransaction>>;
  if (context) await svc.notifyCrossBorderRxFinalised(context);
}

describe("finaliseCrossBorderRxInTransaction — terminal status enforcement (WF-1)", () => {
  it("does not complete a CANCELLED async consultation", async () => {
    state.appointment = { id: ASYNC_APPT_ID, status: "CANCELLED" };
    await runFinalise(ASYNC_APPT_ID).catch(() => {});
    await flush();
    assert.deepEqual(apptWrites(), [], "no appointment write may be issued");
  });

  it("leaves consultationCompletedAt untouched for a CANCELLED consultation", async () => {
    state.appointment = { id: ASYNC_APPT_ID, status: "CANCELLED" };
    await runFinalise(ASYNC_APPT_ID).catch(() => {});
    await flush();
    const wroteCompletionStamp = apptWrites().some((call) =>
      Object.prototype.hasOwnProperty.call(
        (call.data ?? {}) as Record<string, unknown>,
        "consultationCompletedAt",
      ),
    );
    assert.equal(wroteCompletionStamp, false);
  });

  it("sends no patient, doctor or pharmacy notification after rejection", async () => {
    state.appointment = { id: ASYNC_APPT_ID, status: "CANCELLED" };
    await runFinalise(ASYNC_APPT_ID).catch(() => {});
    await flush();
    assert.deepEqual(completionNotifications(), []);
  });

  it("does not mark the prescription request ACCEPTED/finalised after rejection", async () => {
    state.appointment = { id: ASYNC_APPT_ID, status: "CANCELLED" };
    await runFinalise(ASYNC_APPT_ID).catch(() => {});
    await flush();
    assert.deepEqual(state.claimCalls, [], "the request must not be claimed");
  });

  it("does not re-complete an already COMPLETED consultation", async () => {
    state.appointment = { id: ASYNC_APPT_ID, status: "COMPLETED" };
    await runFinalise(ASYNC_APPT_ID).catch(() => {});
    await flush();
    assert.deepEqual(apptWrites(), []);
    assert.deepEqual(state.claimCalls, []);
  });

  it("still completes a live consultation and fires the notifications", async () => {
    await runFinalise(ASYNC_APPT_ID);
    await flush();
    assert.equal(apptWrites().length, 1, "exactly one appointment write");
    const data = (apptWrites()[0].data ?? {}) as Record<string, unknown>;
    assert.equal(data.status, "COMPLETED");
    assert.ok(data.consultationCompletedAt instanceof Date);
    assert.equal(state.claimCalls.length, 1);
    assert.equal(state.notifyRequestingDoctorCalls.length, 1);
    assert.equal(state.notifyPatientAcceptedCalls.length, 1);
  });

  it("stays a no-op when the request is already finalised (idempotent retry)", async () => {
    state.request = null; // `finalisedAt: null` filter excludes a finalised request
    await runFinalise(ASYNC_APPT_ID);
    await flush();
    assert.deepEqual(apptWrites(), []);
    assert.deepEqual(state.claimCalls, []);
    assert.deepEqual(completionNotifications(), []);
  });

  it("stays a no-op when a concurrent finalise already claimed the request", async () => {
    state.claimCount = 0;
    await runFinalise(ASYNC_APPT_ID);
    await flush();
    assert.deepEqual(apptWrites(), [], "the race loser must not complete the appointment");
    assert.deepEqual(completionNotifications(), [], "no duplicate notifications");
  });

  it("aborts when the consultation is cancelled between the read and the write", async () => {
    // Read saw a live appointment; the conditional write matches zero rows
    // because another request cancelled it in the meantime.
    state.apptUpdateManyCount = 0;
    await runFinalise(ASYNC_APPT_ID).catch(() => {});
    await flush();
    assert.deepEqual(
      completionNotifications(),
      [],
      "no completion-dependent notification may fire when the completion did not land",
    );
  });

  it("rolls the request claim back when the completion is rejected mid-flight", async () => {
    // `finalisedAt` is a one-shot guard: a request left ACCEPTED against a
    // consultation that never completed could never be retried.
    state.apptUpdateManyCount = 0;
    await runFinalise(ASYNC_APPT_ID).catch(() => {});
    await flush();
    assert.equal(state.rolledBack, true, "the claim and the completion must share a transaction");
    assert.deepEqual(state.claimCalls, [], "the request must not stay ACCEPTED");
  });

  it("conditions the completion write on the observed non-terminal status", async () => {
    await runFinalise(ASYNC_APPT_ID);
    await flush();
    const where = (apptWrites()[0].where ?? {}) as Record<string, unknown>;
    assert.equal(where.id, ASYNC_APPT_ID);
    assert.equal(where.status, "REQUEST_RECEIVED");
  });

  it("stays a no-op for a non-cross-border appointment", async () => {
    state.request = null;
    await runFinalise("some-other-appt");
    await flush();
    assert.deepEqual(apptWrites(), []);
  });
});
