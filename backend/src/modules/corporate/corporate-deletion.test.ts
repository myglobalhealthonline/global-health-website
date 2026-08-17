import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * Hard deletion is the one corporate action that destroys rows, so what is
 * worth pinning is every way it must REFUSE. A delete that slips through takes
 * the employee's beneficiaries, invites, card and requests with it.
 *
 * Fully mocked — zero DB contact (needs `--experimental-test-module-mocks`).
 */

type Employee = {
  id: string;
  companyId: string;
  userId: string | null;
  preAssessmentAppointmentId: string | null;
  beneficiaries: { userId: string | null }[];
};

const state = {
  employees: [] as Employee[],
  bookedRequests: 0,
  benefitLines: 0,
  subscriptionOrders: 0,
  deleted: [] as string[],
};

const employee = (over: Partial<Employee> = {}): Employee => ({
  id: "emp-1",
  companyId: "co-1",
  userId: "user-1",
  preAssessmentAppointmentId: null,
  beneficiaries: [],
  ...over,
});

let svc: typeof import("./corporate-deletion.service.js");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        corporateEmployee: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            state.employees.find((e) => e.id === where.id) ?? null,
          delete: async ({ where }: { where: { id: string } }) => {
            state.deleted.push(`employee:${where.id}`);
            return { id: where.id };
          },
        },
        corporateCompany: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            state.employees.some((e) => e.companyId === where.id) || where.id === "co-1"
              ? {
                  id: where.id,
                  employees: state.employees
                    .filter((e) => e.companyId === where.id)
                    .map((e) => ({ id: e.id })),
                }
              : null,
          delete: async ({ where }: { where: { id: string } }) => {
            state.deleted.push(`company:${where.id}`);
            return { id: where.id };
          },
        },
        corporateServiceRequest: { count: async () => state.bookedRequests },
        orderItem: { count: async () => state.benefitLines },
        order: { count: async () => state.subscriptionOrders },
      },
    },
  });
  svc = await import("./corporate-deletion.service.js");
});

beforeEach(() => {
  state.employees = [employee()];
  state.bookedRequests = 0;
  state.benefitLines = 0;
  state.subscriptionOrders = 0;
  state.deleted = [];
});

describe("employee deletion", () => {
  it("deletes an employee who never used the plan", async () => {
    const result = await svc.deleteCorporateEmployee("emp-1");
    assert.equal(result.deletable, true);
    assert.deepEqual(state.deleted, ["employee:emp-1"]);
  });

  it("refuses one with a pre-assessment appointment", async () => {
    state.employees = [employee({ preAssessmentAppointmentId: "appt-1" })];
    const result = await svc.deleteCorporateEmployee("emp-1");
    assert.equal(result.deletable, false);
    assert.match(result.deletable === false ? result.reason : "", /remove them instead/i);
    assert.deepEqual(state.deleted, [], "nothing may be deleted on a refusal");
  });

  it("refuses one who booked a requested consultation", async () => {
    state.bookedRequests = 1;
    assert.equal((await svc.deleteCorporateEmployee("emp-1")).deletable, false);
    assert.deepEqual(state.deleted, []);
  });

  /** The employee themselves may be spotless while a family member spent the
   *  benefit — the order line is on the beneficiary's user, not theirs. */
  it("refuses one whose beneficiary used the benefit at checkout", async () => {
    state.employees = [employee({ userId: null, beneficiaries: [{ userId: "user-2" }] })];
    state.benefitLines = 1;
    assert.equal((await svc.deleteCorporateEmployee("emp-1")).deletable, false);
    assert.deepEqual(state.deleted, []);
  });

  it("refuses an unknown id rather than reporting success", async () => {
    state.employees = [];
    assert.equal((await svc.deleteCorporateEmployee("emp-nope")).deletable, false);
  });
});

describe("company deletion", () => {
  it("deletes a company with no history", async () => {
    const result = await svc.deleteCorporateCompany("co-1");
    assert.equal(result.deletable, true);
    assert.deepEqual(state.deleted, ["company:co-1"]);
  });

  it("refuses one with billing orders", async () => {
    state.subscriptionOrders = 1;
    assert.equal((await svc.deleteCorporateCompany("co-1")).deletable, false);
    assert.deepEqual(state.deleted, []);
  });

  it("refuses one whose members used the plan at checkout", async () => {
    state.benefitLines = 1;
    assert.equal((await svc.deleteCorporateCompany("co-1")).deletable, false);
  });

  /** Otherwise deleting the company would be a back door around the
   *  per-employee rule. */
  it("refuses when any single employee would be refused", async () => {
    state.employees = [employee(), employee({ id: "emp-2", preAssessmentAppointmentId: "appt-9" })];
    const result = await svc.deleteCorporateCompany("co-1");
    assert.equal(result.deletable, false);
    assert.match(result.deletable === false ? result.reason : "", /expire it instead/i);
    assert.deepEqual(state.deleted, []);
  });
});
