import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * The coupon rule engine. Fully mocked — zero DB contact, same technique as
 * `commission.service.test.ts` (`--experimental-test-module-mocks`, already on
 * the `pnpm test` script).
 *
 * The ORDER of the checks is a product decision, not an implementation detail:
 * the first failure is the message the customer sees. A coupon that is both
 * expired AND locked to somebody else must report EXPIRED, because reporting
 * the address would tell a stranger whose code they are holding. Each test here
 * pins one step of that order.
 */

type CouponRow = {
  id: string;
  code: string;
  kind: "PERSONAL" | "GENERAL";
  discountPercent: number;
  personalEmail: string | null;
  validFrom: Date;
  validUntil: Date;
  maxRedemptions: number;
  redeemedCount: number;
  active: boolean;
};

const state: {
  coupons: Record<string, CouponRow>;
  commissionCountries: Record<string, boolean>;
} = { coupons: {}, commissionCountries: {} };

let svc: typeof import("./coupon-eligibility.js");

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-01T12:00:00.000Z");

function coupon(overrides: Partial<CouponRow> = {}): CouponRow {
  return {
    id: "cpn_1",
    code: "SUMMER20",
    kind: "GENERAL",
    discountPercent: 20,
    personalEmail: null,
    validFrom: new Date(NOW.getTime() - DAY),
    validUntil: new Date(NOW.getTime() + DAY),
    maxRedemptions: 10,
    redeemedCount: 0,
    active: true,
    ...overrides,
  };
}

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        coupon: {
          findUnique: async (args: { where: { code: string } }) =>
            state.coupons[args.where.code] ?? null,
        },
        country: {
          findFirst: async (args: { where: { code: { equals: string } } }) => {
            const code = args.where.code.equals.toLowerCase();
            if (!(code in state.commissionCountries)) return null;
            return { commissionReceiptEnabled: state.commissionCountries[code] };
          },
        },
      },
    },
  });
  // `isCommissionCountry` lives in commission.service, which pulls the ops
  // alerter and through it the whole env schema. Stubbed for the same reason
  // commission.service.test.ts stubs it: this suite must not need a real .env.
  mock.module("../subscriptions/ops/ops-alert.js", {
    namedExports: { emitOpsAlert: async () => {} },
  });

  svc = await import("./coupon-eligibility.js");
});

beforeEach(() => {
  state.coupons = { SUMMER20: coupon() };
  state.commissionCountries = { ie: false, br: true };
});

const base = {
  code: "SUMMER20",
  email: "patient@example.com",
  countryCode: "ie",
  hasCoverageLine: false,
  hasBenefitLine: false,
  now: NOW,
};

describe("resolveCoupon — identity", () => {
  it("accepts a plain valid general coupon", async () => {
    const result = await svc.resolveCoupon(base);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.coupon.code, "SUMMER20");
      assert.equal(result.coupon.discountPercent, 20);
    }
  });

  it("normalizes case and whitespace before looking up", async () => {
    const result = await svc.resolveCoupon({ ...base, code: "  summer 20 " });
    assert.equal(result.ok, true);
  });

  it("reports an unknown code as NOT_FOUND", async () => {
    const result = await svc.resolveCoupon({ ...base, code: "NOSUCHCODE" });
    assert.deepEqual(result, { ok: false, reason: "NOT_FOUND" });
  });

  it("reports a malformed code as NOT_FOUND, never as its own reason", async () => {
    // A distinct "bad format" reply would narrow the search space for a guesser.
    const result = await svc.resolveCoupon({ ...base, code: "A!" });
    assert.deepEqual(result, { ok: false, reason: "NOT_FOUND" });
  });

  it("reports a disabled coupon as INACTIVE", async () => {
    state.coupons.SUMMER20 = coupon({ active: false });
    const result = await svc.resolveCoupon(base);
    assert.deepEqual(result, { ok: false, reason: "INACTIVE" });
  });

  it("reports a future coupon as NOT_STARTED", async () => {
    state.coupons.SUMMER20 = coupon({ validFrom: new Date(NOW.getTime() + DAY) });
    const result = await svc.resolveCoupon(base);
    assert.deepEqual(result, { ok: false, reason: "NOT_STARTED" });
  });

  it("reports a past coupon as EXPIRED", async () => {
    state.coupons.SUMMER20 = coupon({ validUntil: new Date(NOW.getTime() - 1) });
    const result = await svc.resolveCoupon(base);
    assert.deepEqual(result, { ok: false, reason: "EXPIRED" });
  });

  it("reports a fully redeemed coupon as EXHAUSTED", async () => {
    state.coupons.SUMMER20 = coupon({ maxRedemptions: 2, redeemedCount: 2 });
    const result = await svc.resolveCoupon(base);
    assert.deepEqual(result, { ok: false, reason: "EXHAUSTED" });
  });
});

describe("resolveCoupon — personal coupons", () => {
  beforeEach(() => {
    state.coupons.SUMMER20 = coupon({ kind: "PERSONAL", personalEmail: "owner@example.com" });
  });

  it("accepts the assigned address", async () => {
    const result = await svc.resolveCoupon({ ...base, email: "owner@example.com" });
    assert.equal(result.ok, true);
  });

  it("matches the assigned address case-insensitively", async () => {
    const result = await svc.resolveCoupon({ ...base, email: "  Owner@Example.COM " });
    assert.equal(result.ok, true);
  });

  it("refuses a different address", async () => {
    const result = await svc.resolveCoupon({ ...base, email: "someone@else.com" });
    assert.deepEqual(result, { ok: false, reason: "EMAIL_MISMATCH" });
  });

  it("refuses when no email is known yet", async () => {
    const result = await svc.resolveCoupon({ ...base, email: null });
    assert.deepEqual(result, { ok: false, reason: "EMAIL_MISMATCH" });
  });

  it("reports EXPIRED before EMAIL_MISMATCH, so a stale code names nobody", async () => {
    state.coupons.SUMMER20 = coupon({
      kind: "PERSONAL",
      personalEmail: "owner@example.com",
      validUntil: new Date(NOW.getTime() - 1),
    });
    const result = await svc.resolveCoupon({ ...base, email: "someone@else.com" });
    assert.deepEqual(result, { ok: false, reason: "EXPIRED" });
  });
});

describe("resolveCoupon — eligibility", () => {
  it("refuses a commission market", async () => {
    const result = await svc.resolveCoupon({ ...base, countryCode: "br" });
    assert.deepEqual(result, { ok: false, reason: "COMMISSION_MARKET" });
  });

  it("refuses an insurance or declared-coverage cart", async () => {
    const result = await svc.resolveCoupon({ ...base, hasCoverageLine: true });
    assert.deepEqual(result, { ok: false, reason: "COVERAGE_LINE" });
  });

  it("refuses a membership / corporate / plan cart", async () => {
    const result = await svc.resolveCoupon({ ...base, hasBenefitLine: true });
    assert.deepEqual(result, { ok: false, reason: "BENEFIT_LINE" });
  });

  it("checks identity before eligibility, so a bad code never reveals cart state", async () => {
    const result = await svc.resolveCoupon({
      ...base,
      code: "NOSUCHCODE",
      countryCode: "br",
      hasCoverageLine: true,
    });
    assert.deepEqual(result, { ok: false, reason: "NOT_FOUND" });
  });
});

describe("isIdentityReason", () => {
  it("classifies the reasons the public endpoint must not distinguish", () => {
    for (const reason of [
      "NOT_FOUND",
      "INACTIVE",
      "NOT_STARTED",
      "EXPIRED",
      "EXHAUSTED",
      "EMAIL_MISMATCH",
    ] as const) {
      assert.equal(svc.isIdentityReason(reason), true, reason);
    }
  });

  it("classifies the cart-shaped reasons as safe to explain", () => {
    for (const reason of [
      "COMMISSION_MARKET",
      "COVERAGE_LINE",
      "BENEFIT_LINE",
      "BELOW_MINIMUM",
    ] as const) {
      assert.equal(svc.isIdentityReason(reason), false, reason);
    }
  });
});
