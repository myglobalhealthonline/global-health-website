import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";

/**
 * §25 / §16.1 — persisting the cart-level benefit choice.
 *
 * The authorization side (who may write it, what a foreign enrollment id
 * returns) lives in `authz-matrix.test.ts`. What is left here is the part that
 * keeps the cart internally consistent: the per-line `benefitSelection` must
 * follow the cart-level source, or the preview shows a plan credit the §6.4
 * switch will not honour.
 *
 * DB-backed, so it skips when Postgres is unreachable.
 */
describe("cart benefit selection", () => {
  let prisma: PrismaClient | null = null;
  let svc: typeof import("./benefit-selection.service.js");

  const uniq = `bs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryId = "";
  let serviceId = "";
  let userId = "";
  let cartId = "";
  let enrollmentId = "";
  let expiredEnrollmentId = "";
  let planId = "";

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    svc = await import("./benefit-selection.service.js");

    const currency = await prisma.currency.create({
      data: { code: `S${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `s${uniq}`.slice(0, 8).toLowerCase(),
        name: `Selection Test ${uniq}`,
        slug: `selection-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/shg-${uniq}`,
        teamPath: `/stm-${uniq}`,
        generalConsultationPath: `/sgn-${uniq}`,
        specialistConsultationPath: `/ssp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;
    const service = await prisma.service.create({
      data: {
        countryId,
        kind: "GENERAL",
        name: "Selection GP",
        slug: `selection-gp-${uniq}`.toLowerCase(),
        basePriceCents: 6000,
        currencyCode: currency.code,
      },
    });
    serviceId = service.id;
    const user = await prisma.user.create({
      data: {
        email: `selection-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Selection Member",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;
    const cart = await prisma.cart.create({
      data: { userId, countryCode: country.code, currencyCode: currency.code },
    });
    cartId = cart.id;

    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `selection-plan-${uniq}`, name: "Selection Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, slug: "gold", name: "Gold", isDefault: true },
    });
    const enrollment = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: level.id,
        countryId,
        membershipId: `BS-${uniq}`.toUpperCase(),
        email: user.email,
        firstName: "Selection",
        lastName: "Member",
        userId,
        linkedAt: new Date(),
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
      },
    });
    enrollmentId = enrollment.id;
    const expired = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: level.id,
        countryId,
        membershipId: `BS-${uniq}-X`.toUpperCase(),
        email: `selection-x-${uniq}@test.local`,
        firstName: "Expired",
        lastName: "Member",
        userId,
        linkedAt: new Date(),
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-02-01"),
      },
    });
    expiredEnrollmentId = expired.id;
  });

  beforeEach(async () => {
    if (!prisma || !cartId) return;
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cartItem.create({
      data: {
        cartId,
        kind: "GENERAL_CONSULTATION",
        serviceId,
        name: "Consultation",
        unitPriceCents: 6000,
        quantity: 1,
      },
    });
    await prisma.cart.update({
      where: { id: cartId },
      data: { benefitSource: "UNSET", membershipEnrollmentId: null },
    });
  });

  after(async () => {
    if (!prisma || !countryId) return;
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.service.deleteMany({ where: { countryId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  const cartState = async () =>
    prisma!.cart.findUnique({
      where: { id: cartId },
      select: {
        benefitSource: true,
        membershipEnrollmentId: true,
        membershipDeclineUnit: true,
        items: { select: { benefitSelection: true } },
      },
    });

  it("records a membership choice on the cart", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.setCartBenefit(userId, {
      source: "MEMBERSHIP",
      refId: enrollmentId,
    });
    assert.equal(result.ok, true);
    const cart = await cartState();
    assert.equal(cart?.benefitSource, "MEMBERSHIP");
    assert.equal(cart?.membershipEnrollmentId, enrollmentId);
  });

  /**
   * Decision 44. The suffix travels on the refId and lands in a column,
   * because without one the choice dies between add-to-cart and checkout —
   * and checkout, which re-derives every price, would always take the unit.
   */
  it("records a declined allowance unit from the :discount suffix", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.setCartBenefit(userId, {
      source: "MEMBERSHIP",
      refId: `${enrollmentId}:discount`,
    });
    assert.equal(result.ok, true);
    const cart = await cartState();
    assert.equal(cart?.membershipEnrollmentId, enrollmentId, "the suffix is not part of the id");
    assert.equal(cart?.membershipDeclineUnit, true);
  });

  it("the :unit suffix takes the unit, and clears a previously declined one", async (t) => {
    if (!prisma) return t.skip();
    await svc.setCartBenefit(userId, { source: "MEMBERSHIP", refId: `${enrollmentId}:discount` });
    const result = await svc.setCartBenefit(userId, {
      source: "MEMBERSHIP",
      refId: `${enrollmentId}:unit`,
    });
    assert.equal(result.ok, true);
    const cart = await cartState();
    assert.equal(cart?.membershipEnrollmentId, enrollmentId);
    assert.equal(cart?.membershipDeclineUnit, false, "switching back must not stick on declined");
  });

  it("an unrecognised suffix falls back to taking the unit, never to the pricier side", () => {
    assert.deepEqual(svc.parseMembershipRefId("enr_1"), {
      enrollmentId: "enr_1",
      declineUnit: false,
    });
    assert.deepEqual(svc.parseMembershipRefId("enr_1:unit"), {
      enrollmentId: "enr_1",
      declineUnit: false,
    });
    assert.deepEqual(svc.parseMembershipRefId("enr_1:discount"), {
      enrollmentId: "enr_1",
      declineUnit: true,
    });
    // A stale client sending something else must cost the member LESS than
    // they expected, never more — so it reads as "take the unit".
    assert.deepEqual(svc.parseMembershipRefId("enr_1:bogus"), {
      enrollmentId: "enr_1:bogus",
      declineUnit: false,
    });
  });

  it("refuses an enrollment whose term has ended", async (t) => {
    if (!prisma) return t.skip();
    // The term is re-checked live at pricing anyway, but recording a dead
    // membership would show the patient a benefit they cannot have.
    const result = await svc.setCartBenefit(userId, {
      source: "MEMBERSHIP",
      refId: expiredEnrollmentId,
    });
    assert.equal(result.ok, false);
    assert.equal((await cartState())?.benefitSource, "UNSET");
  });

  it("maps a public-plan choice onto the per-line selection", async (t) => {
    if (!prisma) return t.skip();
    const credit = await svc.setCartBenefit(userId, { source: "PUBLIC_PLAN", refId: "credit" });
    assert.equal(credit.ok, true);
    assert.deepEqual((await cartState())?.items, [{ benefitSelection: "USE_PLAN_CREDIT" }]);

    const discount = await svc.setCartBenefit(userId, {
      source: "PUBLIC_PLAN",
      refId: "discount",
    });
    assert.equal(discount.ok, true);
    assert.deepEqual((await cartState())?.items, [{ benefitSelection: "USE_PLAN_DISCOUNT" }]);
  });

  it("rejects a public-plan choice that names neither credit nor discount", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.setCartBenefit(userId, { source: "PUBLIC_PLAN", refId: "whatever" });
    assert.equal(result.ok, false);
  });

  it("clears the per-line plan selection when the source changes", async (t) => {
    if (!prisma) return t.skip();
    // Otherwise the cart preview keeps showing a credit the checkout switch
    // will not honour, and the patient sees one price and is charged another.
    await svc.setCartBenefit(userId, { source: "PUBLIC_PLAN", refId: "credit" });
    await svc.setCartBenefit(userId, { source: "MEMBERSHIP", refId: enrollmentId });
    const cart = await cartState();
    assert.deepEqual(cart?.items, [{ benefitSelection: "PAY_NORMAL" }]);
    assert.equal(cart?.benefitSource, "MEMBERSHIP");
  });

  it("drops the enrollment when the patient switches away from MEMBERSHIP", async (t) => {
    if (!prisma) return t.skip();
    await svc.setCartBenefit(userId, { source: "MEMBERSHIP", refId: `${enrollmentId}:discount` });
    await svc.setCartBenefit(userId, { source: "NONE" });
    const cart = await cartState();
    assert.equal(cart?.benefitSource, "NONE");
    assert.equal(cart?.membershipEnrollmentId, null);
    // The declined-unit flag has to go with it: a stale `true` would price
    // the next membership booking on the country rule with no UI saying why.
    assert.equal(cart?.membershipDeclineUnit, false);
  });

  it("hasEligibleBenefitSources is false for a guest", async (t) => {
    if (!prisma) return t.skip();
    // §6.4's UNSET rule leans on this: a guest has nothing to choose, so their
    // cart resolves to NONE and checkout proceeds instead of blocking.
    assert.equal(
      await svc.hasEligibleBenefitSources({ userId: null, serviceIds: [serviceId] }),
      false,
    );
  });
});
