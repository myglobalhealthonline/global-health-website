import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * Corporate consultation booking. Two properties carry the whole feature and
 * neither is visible from a type check:
 *
 *   1. **It never mints an Order.** Doctor payouts and invoices are derived
 *      from `OrderItem`, so "free and outside payout" is enforced by the
 *      absence of an order rather than by any exclusion rule. A future edit
 *      that adds one here would silently start paying doctors for free
 *      consultations.
 *   2. **The slot must belong to the ASSIGNED doctor.** The consultation names
 *      one doctor; without this check a member could post any open slot id and
 *      book someone their plan never assigned.
 *
 * Fully mocked — zero DB contact, same module-mock pattern as
 * commission.service.test.ts (needs `--experimental-test-module-mocks`).
 */

type Row = Record<string, unknown> | null;

const state: {
  corporateService: Row;
  slot: Row;
  gate: { ok: boolean; requestId?: string; employeeId?: string; message?: string; isMember?: boolean };
  created: Record<string, unknown>[];
  claimedRequests: string[];
  claimDuration: number | null;
} = {
  corporateService: null,
  slot: null,
  gate: { ok: true },
  created: [],
  claimedRequests: [],
  claimDuration: null,
};

let svc: typeof import("./corporate-booking.service.js");

before(async () => {
  const tx = {
    appointment: {
      create: async (args: { data: Record<string, unknown> }) => {
        state.created.push(args.data);
        return args.data;
      },
    },
  };
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        corporatePlanService: {
          findFirst: async () => state.corporateService,
          findMany: async () => [],
        },
        doctorTimeSlot: { findUnique: async () => state.slot },
        $transaction: async (fn: (client: unknown) => Promise<unknown>) => fn(tx),
      },
    },
  });
  mock.module("../doctor-availability/doctor-availability.service.js", {
    namedExports: {
      SlotAlreadyTakenError: class SlotAlreadyTakenError extends Error {},
      listOpenSlotsForDoctor: async () => [],
      claimConsecutiveSlots: async (
        _client: unknown,
        _slotId: string,
        durationMinutes: number | null,
      ) => {
        state.claimDuration = durationMinutes;
        return { doctorId: "doc-1", startAt: new Date("2026-09-01T09:00:00Z"), endAt: new Date() };
      },
    },
  });
  mock.module("./corporate-benefit.service.js", {
    namedExports: { assertCorporateServiceBookable: async () => state.gate },
  });
  mock.module("./corporate-status.service.js", {
    namedExports: {
      claimCorporateRequest: async (_tx: unknown, requestId: string) => {
        state.claimedRequests.push(requestId);
      },
    },
  });
  svc = await import("./corporate-booking.service.js");
});

beforeEach(() => {
  state.corporateService = {
    id: "cs-1",
    name: "Fit-for-Work Consultation",
    durationMinutes: 45,
    doctorId: "doc-1",
    countryCode: "ie",
    doctor: { active: true, country: { code: "ie" } },
  };
  state.slot = { doctorId: "doc-1", status: "OPEN" };
  state.gate = { ok: true };
  state.created = [];
  state.claimedRequests = [];
  state.claimDuration = null;
});

const input = {
  userId: "user-1",
  corporateServiceId: "cs-1",
  timeSlotId: "slot-1",
  patient: { fullName: "Ann Byrne", email: "Ann@Example.com" },
  consentAccepted: true,
};

describe("bookCorporateConsultation", () => {
  it("books free: no order, zero amount, and settled so nothing chases payment", async () => {
    const result = await svc.bookCorporateConsultation(input);
    assert.equal(result.ok, true);
    assert.equal(state.created.length, 1);
    const appointment = state.created[0];
    assert.equal(appointment.amountCents, 0);
    assert.equal(appointment.paymentStatus, "PAID");
    assert.equal(appointment.corporateServiceId, "cs-1");
    // No Service row backs it, so the display name has to ride on
    // consultationType — that is what every downstream surface renders.
    assert.equal(appointment.consultationType, "Fit-for-Work Consultation");
    assert.equal(appointment.serviceId, undefined);
    assert.equal(appointment.email, "ann@example.com");
  });

  it("consumes the doctor's grid at the consultation's real length", async () => {
    await svc.bookCorporateConsultation(input);
    assert.equal(state.claimDuration, 45);
  });

  it("refuses a slot that belongs to another doctor", async () => {
    state.slot = { doctorId: "doc-2", status: "OPEN" };
    const result = await svc.bookCorporateConsultation(input);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 400);
    assert.equal(state.created.length, 0);
  });

  it("refuses without consent, before anything is read or written", async () => {
    const result = await svc.bookCorporateConsultation({ ...input, consentAccepted: false });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 400);
    assert.equal(state.created.length, 0);
  });

  it("passes the gate's refusal through, disclosing the reason only to members", async () => {
    state.gate = { ok: false, message: "Not on your plan", isMember: true };
    const member = await svc.bookCorporateConsultation(input);
    assert.equal(member.ok === false && member.status, 403);
    assert.equal(member.ok === false && member.message, "Not on your plan");

    state.gate = { ok: false, message: "Not on your plan", isMember: false };
    const stranger = await svc.bookCorporateConsultation(input);
    assert.equal(stranger.ok === false && stranger.status, 404);
    assert.equal(stranger.ok === false && stranger.message, "Consultation not found");
  });

  it("consumes an open company request when the gate found one", async () => {
    state.gate = { ok: true, requestId: "req-9" };
    await svc.bookCorporateConsultation(input);
    assert.deepEqual(state.claimedRequests, ["req-9"]);
  });

  /** The pre-assessment hook used to re-find the employee from the booking and
   *  scoped that search by country, which silently lost anyone whose
   *  consultation is delivered by a doctor in another market. The gate already
   *  knows the row, so the id has to survive the return. */
  it("returns the employee the gate matched, so the status hook needn't re-derive it", async () => {
    state.gate = { ok: true, employeeId: "emp-7" };
    const result = await svc.bookCorporateConsultation(input);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.employeeId, "emp-7");
  });

  it("omits employeeId when the gate named none", async () => {
    const result = await svc.bookCorporateConsultation(input);
    assert.equal(result.ok && result.employeeId, undefined);
  });

  it("books without a request — corporate consultations carry no usage limit", async () => {
    await svc.bookCorporateConsultation(input);
    assert.deepEqual(state.claimedRequests, []);
    assert.equal(state.created.length, 1);
  });

  it("refuses when the assigned doctor has been deactivated", async () => {
    state.corporateService = {
      ...(state.corporateService as Record<string, unknown>),
      doctor: { active: false, country: { code: "ie" } },
    };
    const result = await svc.bookCorporateConsultation(input);
    assert.equal(result.ok === false && result.status, 404);
    assert.equal(state.created.length, 0);
  });
});
