import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";

/**
 * §7 / §16.1 — allowance accounting.
 *
 * Every case here needs Postgres, because the properties under test ARE
 * database properties: `ON CONFLICT DO NOTHING` on the ledger's unique key,
 * and the row lock that `UPDATE ... WHERE used < allocated` takes. Mocking
 * either would test the mock. The suite skips when the database is
 * unreachable, like the other DB-backed ones.
 */
describe("membership allowance — spend, refund, races", () => {
  let prisma: PrismaClient | null = null;
  let svc: typeof import("./membership-allowance.service.js");

  const uniq = `al-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryId = "";
  let planId = "";
  let levelId = "";
  let benefitId = "";
  let serviceId = "";
  let userId = "";
  let enrollmentId = "";
  let dependentId = "";
  let orderId = "";
  let orderItemIds: string[] = [];

  const TERM_START = new Date("2026-01-01T00:00:00.000Z");
  const ALLOCATED = 2;

  /** The enrollment shape the service needs — deliberately minimal. */
  function enrollment(id: string, memberType: "PRIMARY" | "DEPENDENT" = "PRIMARY") {
    return {
      id,
      memberType,
      primaryEnrollmentId: memberType === "DEPENDENT" ? enrollmentId : null,
      startDate: TERM_START,
      level: { allowancePool: "SHARED" as const },
    };
  }

  const benefit = () => ({
    id: benefitId,
    benefitType: "ALLOWANCE" as const,
    allowanceCount: ALLOCATED,
  });

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    svc = await import("./membership-allowance.service.js");

    const currency = await prisma.currency.create({
      data: { code: `A${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `a${uniq}`.slice(0, 8).toLowerCase(),
        name: `Allowance Test ${uniq}`,
        slug: `allowance-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/ahg-${uniq}`,
        teamPath: `/atm-${uniq}`,
        generalConsultationPath: `/agn-${uniq}`,
        specialistConsultationPath: `/asp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;
    const service = await prisma.service.create({
      data: {
        countryId,
        kind: "GENERAL",
        name: "Allowance Test GP",
        slug: `allowance-gp-${uniq}`.toLowerCase(),
        basePriceCents: 6000,
        currencyCode: currency.code,
      },
    });
    serviceId = service.id;
    const user = await prisma.user.create({
      data: {
        email: `allowance-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Allowance Member",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    const plan = await prisma.membershipPlan.create({
      data: { countryId, slug: `allowance-plan-${uniq}`, name: "Allowance Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: {
        planId,
        countryId,
        slug: "gold",
        name: "Gold",
        isDefault: true,
        familyEnabled: true,
        maxDependents: 2,
        allowancePool: "SHARED",
      },
    });
    levelId = level.id;
    const benefitRow = await prisma.membershipBenefit.create({
      data: {
        levelId,
        countryId,
        serviceKind: "GENERAL",
        benefitType: "ALLOWANCE",
        allowanceCount: ALLOCATED,
        fallbackType: "PERCENT",
        fallbackPercent: 20,
      },
    });
    benefitId = benefitRow.id;

    const primary = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `AL-${uniq}`.toUpperCase(),
        email: user.email,
        firstName: "Allowance",
        lastName: "Member",
        userId,
        linkedAt: new Date(),
        status: "ACTIVE",
        startDate: TERM_START,
      },
    });
    enrollmentId = primary.id;
    const dependent = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `AL-${uniq}-D1`.toUpperCase(),
        email: `allowance-dep-${uniq}@test.local`,
        firstName: "Dep",
        lastName: "Member",
        memberType: "DEPENDENT",
        primaryEnrollmentId: primary.id,
        status: "ACTIVE",
        startDate: TERM_START,
      },
    });
    dependentId = dependent.id;

    const order = await prisma.order.create({
      data: {
        orderNumber: `ALW-${uniq}`.slice(0, 30),
        email: user.email,
        fullName: "Allowance Member",
        countryCode: country.code,
        currencyCode: currency.code,
        subtotalCents: 0,
        shippingCents: 0,
        totalCents: 0,
        userId,
        items: {
          create: [0, 1, 2].map((n) => ({
            kind: "GENERAL_CONSULTATION" as const,
            serviceId,
            name: `Line ${n}`,
            unitPriceCents: 0,
            quantity: 1,
            lineTotalCents: 0,
            membershipAllowanceUsed: true,
          })),
        },
      },
      include: { items: true },
    });
    orderId = order.id;
    orderItemIds = order.items.map((i) => i.id);
  });

  beforeEach(async () => {
    if (!prisma || !benefitId) return;
    // Every case starts from an untouched counter and an empty ledger.
    await prisma.membershipUsageLedger.deleteMany({
      where: { orderItemId: { in: orderItemIds } },
    });
    await prisma.membershipAllowanceBalance.deleteMany({ where: { benefitId } });
  });

  after(async () => {
    if (!prisma || !countryId) return;
    await prisma.membershipUsageLedger.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.membershipAllowanceBalance.deleteMany({ where: { benefitId } });
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { countryId } });
    await prisma.service.deleteMany({ where: { countryId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  const usedNow = async () => {
    const row = await prisma!.membershipAllowanceBalance.findFirst({
      where: { benefitId },
      select: { used: true, allocated: true },
    });
    return row;
  };

  it("spends a unit and reports what is left", async (t) => {
    if (!prisma) return t.skip();
    const result = await prisma.$transaction((tx) =>
      svc.spendAllowanceUnit(tx, {
        benefit: benefit(),
        enrollment: enrollment(enrollmentId),
        orderId,
        orderItemId: orderItemIds[0],
      }),
    );
    assert.equal(result.outcome, "spent");
    assert.equal(result.remainingAfter, ALLOCATED - 1);
    assert.deepEqual(await usedNow(), { used: 1, allocated: ALLOCATED });
  });

  it("a retried spend on the same line is a clean no-op, not a unique-key error", async (t) => {
    if (!prisma) return t.skip();
    // This is the reason the ledger insert comes FIRST. Increment-first would
    // move the counter and only then hit the unique key — an error path, with
    // the counter already wrong.
    const run = () =>
      prisma!.$transaction((tx) =>
        svc.spendAllowanceUnit(tx, {
          benefit: benefit(),
          enrollment: enrollment(enrollmentId),
          orderId,
          orderItemId: orderItemIds[0],
        }),
      );
    assert.equal((await run()).outcome, "spent");
    const second = await run();
    assert.equal(second.outcome, "already-spent");
    assert.deepEqual(await usedNow(), { used: 1, allocated: ALLOCATED });
    const ledger = await prisma.membershipUsageLedger.count({
      where: { orderItemId: orderItemIds[0], reason: "SPEND" },
    });
    assert.equal(ledger, 1);
  });

  it("reports 'unavailable' once the pool is empty, and leaves no ledger row behind", async (t) => {
    if (!prisma) return t.skip();
    for (const id of orderItemIds.slice(0, ALLOCATED)) {
      await prisma.$transaction((tx) =>
        svc.spendAllowanceUnit(tx, {
          benefit: benefit(),
          enrollment: enrollment(enrollmentId),
          orderId,
          orderItemId: id,
        }),
      );
    }
    const overspend = await prisma.$transaction((tx) =>
      svc.spendAllowanceUnit(tx, {
        benefit: benefit(),
        enrollment: enrollment(enrollmentId),
        orderId,
        orderItemId: orderItemIds[2],
      }),
    );
    assert.equal(overspend.outcome, "unavailable");
    assert.deepEqual(await usedNow(), { used: ALLOCATED, allocated: ALLOCATED });
    // The row inserted a moment earlier was deleted inside the same
    // transaction, so nothing committed — otherwise the line could never
    // spend a unit later even after an admin adjustment.
    const stray = await prisma.membershipUsageLedger.count({
      where: { orderItemId: orderItemIds[2] },
    });
    assert.equal(stray, 0);
  });

  it("two simultaneous checkouts cannot overspend the last unit", async (t) => {
    if (!prisma) return t.skip();
    // Burn one of two so exactly one unit is contested.
    await prisma.$transaction((tx) =>
      svc.spendAllowanceUnit(tx, {
        benefit: benefit(),
        enrollment: enrollment(enrollmentId),
        orderId,
        orderItemId: orderItemIds[0],
      }),
    );

    // Genuinely concurrent transactions, not sequential awaits: the guarantee
    // under test is the row lock Postgres takes for `WHERE used < allocated`.
    const [a, b] = await Promise.all([
      prisma.$transaction((tx) =>
        svc.spendAllowanceUnit(tx, {
          benefit: benefit(),
          enrollment: enrollment(enrollmentId),
          orderId,
          orderItemId: orderItemIds[1],
        }),
      ),
      prisma.$transaction((tx) =>
        svc.spendAllowanceUnit(tx, {
          benefit: benefit(),
          enrollment: enrollment(dependentId, "DEPENDENT"),
          orderId,
          orderItemId: orderItemIds[2],
        }),
      ),
    ]);

    const outcomes = [a.outcome, b.outcome].sort();
    assert.deepEqual(outcomes, ["spent", "unavailable"]);
    assert.deepEqual(await usedNow(), { used: ALLOCATED, allocated: ALLOCATED });
  });

  it("a dependent on a SHARED pool spends the primary's counter, not its own", async (t) => {
    if (!prisma) return t.skip();
    // The invariant §3.5 depends on: holder + termStart must key identically
    // for a read and a write, or one pool silently becomes two.
    await prisma.$transaction((tx) =>
      svc.spendAllowanceUnit(tx, {
        benefit: benefit(),
        enrollment: enrollment(dependentId, "DEPENDENT"),
        orderId,
        orderItemId: orderItemIds[0],
      }),
    );
    const balances = await prisma.membershipAllowanceBalance.findMany({
      where: { benefitId },
      select: { holderEnrollmentId: true, termStart: true, used: true },
    });
    assert.equal(balances.length, 1);
    assert.equal(balances[0].holderEnrollmentId, enrollmentId);
    assert.equal(balances[0].termStart.toISOString(), TERM_START.toISOString());
    assert.equal(balances[0].used, 1);
  });

  it("refund restores the unit; a second refund is a no-op", async (t) => {
    if (!prisma) return t.skip();
    await prisma.$transaction((tx) =>
      svc.spendAllowanceUnit(tx, {
        benefit: benefit(),
        enrollment: enrollment(enrollmentId),
        orderId,
        orderItemId: orderItemIds[0],
      }),
    );
    const first = await prisma.$transaction((tx) =>
      svc.refundAllowanceUnit(tx, { orderItemId: orderItemIds[0] }),
    );
    assert.equal(first, "refunded");
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });

    const second = await prisma.$transaction((tx) =>
      svc.refundAllowanceUnit(tx, { orderItemId: orderItemIds[0] }),
    );
    assert.equal(second, "no-op");
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });
  });

  it("refunding a line that never spent is a no-op", async (t) => {
    if (!prisma) return t.skip();
    const result = await prisma.$transaction((tx) =>
      svc.refundAllowanceUnit(tx, { orderItemId: orderItemIds[1] }),
    );
    assert.equal(result, "no-op");
    const ledger = await prisma.membershipUsageLedger.count({
      where: { orderItemId: orderItemIds[1] },
    });
    assert.equal(ledger, 0);
  });

  it("the compensating release hands back every unit an order holds", async (t) => {
    if (!prisma) return t.skip();
    // The Stripe-failure path (§7): the order transaction has committed, so
    // the spend cannot be rolled back — it has to be compensated.
    for (const id of orderItemIds.slice(0, ALLOCATED)) {
      await prisma.$transaction((tx) =>
        svc.spendAllowanceUnit(tx, {
          benefit: benefit(),
          enrollment: enrollment(enrollmentId),
          orderId,
          orderItemId: id,
        }),
      );
    }
    assert.deepEqual(await usedNow(), { used: ALLOCATED, allocated: ALLOCATED });

    await svc.releaseOrderMembershipAllowance(orderId);
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });

    // Racing release paths (the catch block, the cancel cron, an admin
    // cancelling) all call this; the second must change nothing.
    await svc.releaseOrderMembershipAllowance(orderId);
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });
  });

  // ── Admin adjust (§7, phase 6) ────────────────────────────────────────

  it("an admin adjust hands units back and writes an audited ledger row", async (t) => {
    if (!prisma) return t.skip();
    await prisma.$transaction(async (tx) => {
      await svc.spendAllowanceUnit(tx, {
        benefit: benefit(),
        enrollment: enrollment(enrollmentId),
        orderId,
        orderItemId: orderItemIds[0]!,
      });
    });
    assert.deepEqual(await usedNow(), { used: 1, allocated: ALLOCATED });

    const result = await svc.adjustEnrollmentAllowance({
      enrollmentId,
      benefitId,
      delta: 1,
      reason: "Goodwill after a cancelled clinic session",
      actorAdminId: null,
    });
    assert.equal(result.appliedDelta, 1);
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });

    const row = await prisma.membershipUsageLedger.findFirst({
      where: { reason: "ADMIN_ADJUST", enrollmentId },
      select: { delta: true, note: true },
    });
    // The reason is the only record of WHY a member's units moved — it is not
    // derivable from any plan configuration, so losing it loses the audit.
    assert.equal(row?.delta, 1);
    assert.equal(row?.note, "Goodwill after a cancelled clinic session");
  });

  it("an adjust clamps into [0, allocated] and reports what it actually applied", async (t) => {
    if (!prisma) return t.skip();
    // Nothing spent: asking for 5 units back can only give 0. Letting `used` go
    // negative would hand out free consultations forever.
    const over = await svc.adjustEnrollmentAllowance({
      enrollmentId,
      benefitId,
      delta: 5,
      reason: "over-refund probe",
      actorAdminId: null,
    });
    assert.equal(over.appliedDelta, 0);
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });

    // And the other direction cannot consume more than the member was sold.
    const under = await svc.adjustEnrollmentAllowance({
      enrollmentId,
      benefitId,
      delta: -99,
      reason: "over-consume probe",
      actorAdminId: null,
    });
    assert.equal(under.appliedDelta, -ALLOCATED);
    assert.deepEqual(await usedNow(), { used: ALLOCATED, allocated: ALLOCATED });

    // A clamped-to-nothing adjust still leaves a ledger row: "an admin tried"
    // is what a later dispute needs to see.
    const rows = await prisma.membershipUsageLedger.count({
      where: { reason: "ADMIN_ADJUST", enrollmentId },
    });
    assert.ok(rows >= 2, `expected both adjust rows, saw ${rows}`);
  });

  it("an adjust refuses a benefit belonging to another level", async (t) => {
    if (!prisma) return t.skip();
    // Otherwise an admin could mint a counter against a plan the member is not
    // on — invisible to pricing, but counted as consumption in that plan's report.
    await assert.rejects(
      () =>
        svc.adjustEnrollmentAllowance({
          enrollmentId,
          benefitId: "not-this-members-benefit",
          delta: 1,
          reason: "wrong level probe",
          actorAdminId: null,
        }),
      /does not belong/,
    );
  });

  // ── Reconciliation backstop (§7, phase 6) ─────────────────────────────

  it("reconciliation returns units still held against a CANCELLED order", async (t) => {
    if (!prisma) return t.skip();
    const job = await import("./membership-expiry.job.js");
    await prisma.membershipAllowanceBalance.updateMany({ where: { benefitId }, data: { used: 0 } });
    await prisma.membershipUsageLedger.deleteMany({ where: { enrollmentId } });

    await prisma.$transaction(async (tx) => {
      await svc.spendAllowanceUnit(tx, {
        benefit: benefit(),
        enrollment: enrollment(enrollmentId),
        orderId,
        orderItemId: orderItemIds[0]!,
      });
    });
    assert.deepEqual(await usedNow(), { used: 1, allocated: ALLOCATED });

    // The order is cancelled but no release ran — exactly the leak the five
    // §7 release sites exist to prevent, and the state this backstop repairs.
    await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    assert.equal(await job.reconcileCancelledOrderAllowance(), 1);
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });

    // Idempotent: the second sweep finds the REFUND row and does nothing.
    assert.equal(await job.reconcileCancelledOrderAllowance(), 0);
    assert.deepEqual(await usedNow(), { used: 0, allocated: ALLOCATED });
  });
});
