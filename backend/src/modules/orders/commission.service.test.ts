import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * Commission billing model (Brazil). The arithmetic here decides what a patient's
 * fiscal document says and how much a doctor is owed, so it is unit-tested rather
 * than left to an end-to-end run.
 *
 * Fully mocked — zero DB contact. `../../db/prisma.js` and the ops-alert emitter
 * are replaced via node:test module mocking; requires
 * `--experimental-test-module-mocks` (already on the `pnpm test` script, same
 * pattern as country-data-policy.service.test.ts).
 */

// ── Mock fixtures, mutated per test ──────────────────────────────────────────

const state: {
  /** Country.code (lowercase) → commissionReceiptEnabled */
  commissionCountries: Record<string, boolean>;
  /** `${serviceId}:${doctorId}` → payout cents (null = row exists, amount unset) */
  serviceDoctorPayouts: Record<string, number | null>;
  /** `${companyId}:${serviceId}:${doctorId}` → payout cents */
  insurancePayouts: Record<string, number | null>;
  alerts: { severity: string; title: string }[];
} = {
  commissionCountries: {},
  serviceDoctorPayouts: {},
  insurancePayouts: {},
  alerts: [],
};

let svc: typeof import("./commission.service.js");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        country: {
          findFirst: async (args: {
            where: { code: { equals: string } };
          }) => {
            const code = args.where.code.equals.toLowerCase();
            if (!(code in state.commissionCountries)) return null;
            return { commissionReceiptEnabled: state.commissionCountries[code] };
          },
        },
        serviceDoctor: {
          findUnique: async (args: {
            where: { serviceId_doctorId: { serviceId: string; doctorId: string } };
          }) => {
            const { serviceId, doctorId } = args.where.serviceId_doctorId;
            const key = `${serviceId}:${doctorId}`;
            if (!(key in state.serviceDoctorPayouts)) return null;
            return { doctorAmountCents: state.serviceDoctorPayouts[key] };
          },
        },
        serviceDoctorInsurancePayout: {
          findUnique: async (args: {
            where: {
              insuranceCompanyId_serviceId_doctorId: {
                insuranceCompanyId: string;
                serviceId: string;
                doctorId: string;
              };
            };
          }) => {
            const { insuranceCompanyId, serviceId, doctorId } =
              args.where.insuranceCompanyId_serviceId_doctorId;
            const key = `${insuranceCompanyId}:${serviceId}:${doctorId}`;
            if (!(key in state.insurancePayouts)) return null;
            return { doctorAmountCents: state.insurancePayouts[key] };
          },
        },
      },
    },
  });

  mock.module("../subscriptions/ops/ops-alert.js", {
    namedExports: {
      emitOpsAlert: async (alert: { severity: string; title: string }) => {
        state.alerts.push(alert);
      },
    },
  });

  svc = await import("./commission.service.js");
});

beforeEach(() => {
  state.commissionCountries = { br: true, ie: false };
  state.serviceDoctorPayouts = {};
  state.insurancePayouts = {};
  state.alerts = [];
});

/** The alert emitter is fire-and-forget (`void`), so let the microtask run. */
const flush = () => new Promise((r) => setImmediate(r));

describe("commission.service", () => {
  describe("isCommissionCountry", () => {
    it("is true only for a country with the flag on", async () => {
      assert.equal(await svc.isCommissionCountry("br"), true);
      assert.equal(await svc.isCommissionCountry("ie"), false);
    });

    it("matches the country code case-insensitively", async () => {
      // Codes are stored lowercase; an upper-cased exact match returns null and
      // would silently drop the market back to standard receipts.
      assert.equal(await svc.isCommissionCountry("BR"), true);
      assert.equal(await svc.isCommissionCountry(" Br "), true);
    });

    it("is false for an unknown or empty country rather than throwing", async () => {
      assert.equal(await svc.isCommissionCountry("zz"), false);
      assert.equal(await svc.isCommissionCountry(""), false);
      assert.equal(await svc.isCommissionCountry(null), false);
      assert.equal(await svc.isCommissionCountry(undefined), false);
    });
  });

  describe("resolveLinePayoutCents", () => {
    it("reads the standard per-(service, doctor) payout", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      assert.equal(
        await svc.resolveLinePayoutCents({ serviceId: "svc-1", doctorId: "doc-1" }),
        14000,
      );
    });

    it("uses the insurance payout and does NOT fall back to the standard one", async () => {
      // An unset insurance payout means "this doctor doesn't take this insurer",
      // which is a different statement from "payout is zero". Falling back to the
      // standard payout would pay the doctor the wrong amount.
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      state.insurancePayouts["ins-1:svc-1:doc-1"] = 9000;
      assert.equal(
        await svc.resolveLinePayoutCents({
          serviceId: "svc-1",
          doctorId: "doc-1",
          insuranceCompanyId: "ins-1",
        }),
        9000,
      );

      assert.equal(
        await svc.resolveLinePayoutCents({
          serviceId: "svc-1",
          doctorId: "doc-1",
          insuranceCompanyId: "ins-unknown",
        }),
        null,
      );
    });

    it("returns null when the line names no service or doctor", async () => {
      assert.equal(await svc.resolveLinePayoutCents({ serviceId: "svc-1" }), null);
      assert.equal(await svc.resolveLinePayoutCents({ doctorId: "doc-1" }), null);
      assert.equal(await svc.resolveLinePayoutCents({}), null);
    });

    it("returns null when the assignment exists but the amount was never set", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = null;
      assert.equal(
        await svc.resolveLinePayoutCents({ serviceId: "svc-1", doctorId: "doc-1" }),
        null,
      );
    });
  });

  describe("booking guard", () => {
    it("blocks a doctor with no payout configured in a commission market", async () => {
      assert.equal(
        await svc.isLineSellableInCommissionMarket({
          countryCode: "br",
          serviceId: "svc-1",
          doctorId: "doc-1",
        }),
        false,
      );
    });

    it("allows the same doctor once a payout is set", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      assert.equal(
        await svc.isLineSellableInCommissionMarket({
          countryCode: "br",
          serviceId: "svc-1",
          doctorId: "doc-1",
        }),
        true,
      );
    });

    it("allows a zero payout — explicitly set is not the same as unset", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 0;
      assert.equal(
        await svc.isLineSellableInCommissionMarket({
          countryCode: "br",
          serviceId: "svc-1",
          doctorId: "doc-1",
        }),
        true,
      );
    });

    it("never blocks outside a commission market", async () => {
      // No payout configured, but Ireland bills the full price — the payout is
      // irrelevant to the receipt there and must not gate bookings.
      assert.equal(
        await svc.isLineSellableInCommissionMarket({
          countryCode: "ie",
          serviceId: "svc-1",
          doctorId: "doc-1",
        }),
        true,
      );
    });

    it("ignores lines that name no doctor (health tests, products)", async () => {
      assert.equal(
        await svc.isLineSellableInCommissionMarket({ countryCode: "br", serviceId: "svc-1" }),
        true,
      );
    });

    it("findUnsellableCommissionLine returns the first offending line", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      const bad = await svc.findUnsellableCommissionLine("br", [
        { id: "a", serviceId: "svc-1", doctorId: "doc-1" },
        { id: "b", serviceId: "svc-2", doctorId: "doc-2" },
      ]);
      assert.equal(bad?.id, "b");

      assert.equal(await svc.findUnsellableCommissionLine("ie", [{ id: "b", serviceId: "svc-2", doctorId: "doc-2" }]), null);
    });
  });

  describe("computeOrderCommission", () => {
    it("splits a single consultation into payout and commission", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      const r = await svc.computeOrderCommission(
        [{ id: "l1", serviceId: "svc-1", doctorId: "doc-1", quantity: 1, unitPriceCents: 20000 }],
        0,
      );
      assert.equal(r.lines[0].doctorPayoutCents, 14000);
      assert.equal(r.lines[0].commissionCents, 6000);
      assert.equal(r.commissionTotalCents, 6000);
      assert.equal(r.doctorPayoutTotalCents, 14000);
    });

    it("multiplies the per-unit payout by quantity", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      const r = await svc.computeOrderCommission(
        [{ id: "l1", serviceId: "svc-1", doctorId: "doc-1", quantity: 3, unitPriceCents: 20000 }],
        0,
      );
      // 60000 charged − 42000 owed = 18000 commission.
      assert.equal(r.lines[0].doctorPayoutCents, 14000, "stored per-unit, not per-line");
      assert.equal(r.lines[0].commissionCents, 18000);
      assert.equal(r.doctorPayoutTotalCents, 42000);
    });

    it("treats shipping and doctor-less lines as 100% commission", async () => {
      const r = await svc.computeOrderCommission(
        [{ id: "kit", quantity: 2, unitPriceCents: 3000 }],
        500,
      );
      assert.equal(r.lines[0].doctorPayoutCents, null);
      assert.equal(r.lines[0].commissionCents, 6000);
      assert.equal(r.commissionTotalCents, 6500, "6000 line + 500 shipping");
      assert.equal(r.doctorPayoutTotalCents, 0);
    });

    it("uses the insurance payout for an insurance line", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      state.insurancePayouts["ins-1:svc-1:doc-1"] = 9000;
      const r = await svc.computeOrderCommission(
        [
          {
            id: "l1",
            serviceId: "svc-1",
            doctorId: "doc-1",
            insuranceCompanyId: "ins-1",
            quantity: 1,
            unitPriceCents: 12000,
          },
        ],
        0,
      );
      assert.equal(r.lines[0].doctorPayoutCents, 9000);
      assert.equal(r.lines[0].commissionCents, 3000);
    });

    it("keeps commission + payout equal to the amount charged (mixed basket)", async () => {
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      const lines = [
        { id: "l1", serviceId: "svc-1", doctorId: "doc-1", quantity: 1, unitPriceCents: 20000 },
        { id: "l2", quantity: 2, unitPriceCents: 3000 },
      ];
      const shipping = 500;
      const r = await svc.computeOrderCommission(lines, shipping);
      const charged =
        lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0) + shipping;
      assert.equal(
        r.commissionTotalCents + r.doctorPayoutTotalCents,
        charged,
        "every cent is either the doctor's or ours",
      );
    });

    it("honours an explicit payout override without hitting the lookup", async () => {
      // Cross-border prescriptions price off DoctorCrossBorderRxCountry and create
      // a line carrying neither serviceId nor doctorId.
      const r = await svc.computeOrderCommission(
        [{ id: "l1", quantity: 1, unitPriceCents: 9000, payoutOverrideCents: 6000 }],
        0,
      );
      assert.equal(r.lines[0].doctorPayoutCents, 6000);
      assert.equal(r.lines[0].commissionCents, 3000);
      await flush();
      assert.equal(state.alerts.length, 0, "an override is a known payout, not a missing one");
    });

    it("alerts and bills the full line when a doctor line has no payout", async () => {
      const r = await svc.computeOrderCommission(
        [{ id: "l1", serviceId: "svc-1", doctorId: "doc-1", quantity: 1, unitPriceCents: 20000 }],
        0,
      );
      assert.equal(r.lines[0].doctorPayoutCents, null);
      assert.equal(r.lines[0].commissionCents, 20000);
      await flush();
      assert.equal(state.alerts.length, 1);
      assert.equal(state.alerts[0].severity, "critical");
    });

    it("does NOT alert for a doctor-less line", async () => {
      await svc.computeOrderCommission([{ id: "kit", quantity: 1, unitPriceCents: 3000 }], 0);
      await flush();
      assert.equal(state.alerts.length, 0);
    });

    it("clamps a negative commission to zero and alerts", async () => {
      // Reachable when an off-peak or negotiated price drops below a payout that
      // was set against the base price. A negative receipt must never be issued.
      state.serviceDoctorPayouts["svc-1:doc-1"] = 14000;
      const r = await svc.computeOrderCommission(
        [{ id: "l1", serviceId: "svc-1", doctorId: "doc-1", quantity: 1, unitPriceCents: 10000 }],
        0,
      );
      assert.equal(r.lines[0].commissionCents, 0);
      assert.equal(r.commissionTotalCents, 0);
      assert.equal(r.doctorPayoutTotalCents, 14000, "the doctor is still owed the full payout");
      await flush();
      assert.equal(state.alerts.length, 1);
      assert.equal(state.alerts[0].severity, "critical");
    });

    it("returns zeroed totals for an empty basket", async () => {
      const r = await svc.computeOrderCommission([], 0);
      assert.deepEqual(r, { lines: [], commissionTotalCents: 0, doctorPayoutTotalCents: 0 });
    });
  });
});
