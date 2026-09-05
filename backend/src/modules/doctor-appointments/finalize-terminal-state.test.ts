import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * WF-2 — doctor finalisation must never complete a terminal appointment.
 *
 * `finalizeDoctorAppointment` selected the current status and then wrote
 * `status: "COMPLETED"` without consulting it, so a CANCELLED consultation
 * could be flipped to COMPLETED. That single write drags a payout row
 * (`consultationCompletedAt`), a review invitation, a Brazil finalisation
 * email and — via `doctorHasTreatmentRelationship`, which excludes only
 * CANCELLED — a fresh PHI treatment relationship behind it.
 *
 * Fully mocked — zero DB / email contact (needs
 * `--experimental-test-module-mocks`).
 */

type Row = Record<string, unknown> | null;

const state: {
  appointment: Row;
  /** Rows the atomic conditional claim reports as matched. */
  updateManyCount: number;
  updateManyCalls: Record<string, unknown>[];
  updateCalls: Record<string, unknown>[];
  reviewInviteCalls: string[];
  brazilEmailCalls: Record<string, unknown>[];
} = {
  appointment: null,
  updateManyCount: 1,
  updateManyCalls: [],
  updateCalls: [],
  reviewInviteCalls: [],
  brazilEmailCalls: [],
};

let svc: typeof import("./doctor-appointments.service.js");

const DOCTOR_ID = "doc-1";
const APPT_ID = "appt-1";
const FLAGS = { notesUploaded: true, filesUploaded: true };
const COMPLETED_AT = new Date("2026-01-05T10:00:00.000Z");

function liveAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: APPT_ID,
    countryCode: "BR",
    fullName: "Ana Silva",
    email: "ana@example.com",
    status: "REQUEST_RECEIVED",
    finalized: false,
    ...overrides,
  };
}

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        appointment: {
          findFirst: async () => state.appointment,
          update: async (args: Record<string, unknown>) => {
            state.updateCalls.push(args);
            const appt = state.appointment ?? {};
            return {
              ...appt,
              status: "COMPLETED",
              finalized: true,
              notesUploaded: true,
              filesUploaded: true,
              consultationCompletedAt: COMPLETED_AT,
            };
          },
          updateMany: async (args: Record<string, unknown>) => {
            state.updateManyCalls.push(args);
            return { count: state.updateManyCount };
          },
        },
      },
    },
  });
  mock.module("../review-invites/review-invite.service.js", {
    namedExports: {
      createReviewInviteForAppointment: async (id: string) => {
        state.reviewInviteCalls.push(id);
      },
    },
  });
  mock.module("../../lib/email/templates.js", {
    namedExports: {
      sendBrazilFinalizationEmail: async (input: Record<string, unknown>) => {
        state.brazilEmailCalls.push(input);
      },
    },
  });
  svc = await import("./doctor-appointments.service.js");
});

beforeEach(() => {
  state.appointment = liveAppointment();
  state.updateManyCount = 1;
  state.updateManyCalls = [];
  state.updateCalls = [];
  state.reviewInviteCalls = [];
  state.brazilEmailCalls = [];
});

/** Every write this service could issue, whichever Prisma verb it uses. */
function allWrites() {
  return [...state.updateCalls, ...state.updateManyCalls];
}

/** Let the fire-and-forget review-invite / email tails settle. */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("finalizeDoctorAppointment — terminal status enforcement (WF-2)", () => {
  it("rejects CANCELLED -> COMPLETED", async () => {
    state.appointment = liveAppointment({ status: "CANCELLED" });
    await assert.rejects(
      () => svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS),
      (err: Error) => /transition/i.test(err.message),
    );
  });

  it("leaves a CANCELLED appointment untouched — no status or completion write", async () => {
    state.appointment = liveAppointment({ status: "CANCELLED" });
    await svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS).catch(() => {});
    await flush();
    assert.deepEqual(allWrites(), [], "no appointment write may be issued");
  });

  it("fires no review invitation, Brazil email or payout-bearing completion after rejection", async () => {
    state.appointment = liveAppointment({ status: "CANCELLED" });
    await svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS).catch(() => {});
    await flush();
    assert.deepEqual(state.reviewInviteCalls, []);
    assert.deepEqual(state.brazilEmailCalls, []);
  });

  it("rejects an already-COMPLETED appointment (terminal, both directions)", async () => {
    state.appointment = liveAppointment({ status: "COMPLETED" });
    await assert.rejects(
      () => svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS),
      (err: Error) => /transition/i.test(err.message),
    );
    await flush();
    assert.deepEqual(allWrites(), []);
  });

  it("still completes a live appointment", async () => {
    const updated = await svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS);
    await flush();
    assert.equal(updated?.status, "COMPLETED");
    assert.equal(updated?.finalized, true);
    assert.ok(updated?.consultationCompletedAt instanceof Date);
    assert.equal(allWrites().length, 1);
    assert.deepEqual(state.reviewInviteCalls, [APPT_ID]);
    assert.equal(state.brazilEmailCalls.length, 1);
  });

  it("still completes a CONTACTED appointment", async () => {
    state.appointment = liveAppointment({ status: "CONTACTED", countryCode: "PT" });
    const updated = await svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS);
    await flush();
    assert.equal(updated?.status, "COMPLETED");
    assert.deepEqual(state.brazilEmailCalls, [], "non-BR country sends no Brazil email");
  });

  it("keeps the documented idempotent retry: already finalized still 409s, writes nothing", async () => {
    state.appointment = liveAppointment({ finalized: true, status: "COMPLETED" });
    await assert.rejects(
      () => svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS),
      /already finalized/,
    );
    await flush();
    assert.deepEqual(allWrites(), []);
    assert.deepEqual(state.reviewInviteCalls, []);
  });

  it("returns null for an appointment that is not this doctor's", async () => {
    state.appointment = null;
    assert.equal(await svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS), null);
    await flush();
    assert.deepEqual(allWrites(), []);
  });

  it("guards the write against a concurrent cancellation (read/cancel/write race)", async () => {
    // The row was live when read, then cancelled by another request. The
    // conditional write must match zero rows and the finalisation must abort
    // rather than overwrite the cancellation.
    state.updateManyCount = 0;
    await assert.rejects(
      () => svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS),
      (err: Error) => /transition/i.test(err.message),
    );
    await flush();
    assert.deepEqual(state.reviewInviteCalls, [], "no review invite for a lost race");
    assert.deepEqual(state.brazilEmailCalls, [], "no completion email for a lost race");
  });

  it("scopes the conditional write to the doctor, the open flag and the observed status", async () => {
    await svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, FLAGS);
    await flush();
    const where = (state.updateManyCalls[0]?.where ?? {}) as Record<string, unknown>;
    assert.equal(where.id, APPT_ID);
    assert.equal(where.doctorId, DOCTOR_ID);
    assert.equal(where.finalized, false);
    assert.equal(where.status, "REQUEST_RECEIVED");
  });

  it("still refuses to finalize without both upload flags", async () => {
    await assert.rejects(
      () =>
        svc.finalizeDoctorAppointment(DOCTOR_ID, APPT_ID, {
          notesUploaded: false,
          filesUploaded: true,
        }),
      /Both notes and files/,
    );
    await flush();
    assert.deepEqual(allWrites(), []);
  });
});
