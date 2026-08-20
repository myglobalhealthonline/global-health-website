import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, beforeEach, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { CartBenefitSource, PrismaClient } from "@prisma/client";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * §6.4 / §16.2 — the checkout benefit switch.
 *
 * The property that matters is that EXACTLY ONE engine runs per order, chosen
 * by the patient. Phase 5's user-visible change lives here: corporate's
 * discount used to apply automatically and now applies only when the patient
 * picked it, so `NONE` charging full price to a corporate member is the
 * regression test for the intended behaviour, not a bug report.
 *
 * Cart lines are created directly rather than through `POST /api/cart/items`:
 * the add-to-cart path needs held slots, doctor assignments and availability
 * windows, none of which the switch reads. Without a slot every line prices at
 * its own `unitPriceCents`, which keeps the arithmetic legible.
 *
 * Skips when buildApp can't reach Postgres, matching the other route suites.
 */
describe("checkout — benefit source switch (§6.4)", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];

  const uniq = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const PRICE = 6000;
  const ALLOWANCE = 1;
  const CORPORATE_PERCENT = 25;

  let currencyId = "";
  let countryId = "";
  let countryCode = "";
  let currencyCode = "";
  let serviceId = "";
  let userId = "";
  let cartId = "";
  let enrollmentId = "";
  let benefitId = "";
  let planId = "";
  let corporatePlanId = "";
  let corporateCompanyId = "";
  let otherUserId = "";
  let otherEnrollmentId = "";
  let awayCountryId = "";
  let awayServiceId = "";
  let awayBenefitId = "";
  let cookie: Record<string, string> = {};

  const checkoutBody = {
    email: `checkout-${uniq}@test.local`,
    fullName: "Checkout Member",
  };

  async function seedCart(
    benefitSource: CartBenefitSource,
    opts: {
      lines?: number;
      membershipEnrollmentId?: string | null;
      declineUnit?: boolean;
      serviceId?: string;
    } = {},
  ) {
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cart.update({
      where: { id: cartId },
      data: {
        countryCode,
        currencyCode,
        benefitSource,
        membershipEnrollmentId: opts.membershipEnrollmentId ?? null,
        membershipDeclineUnit: opts.declineUnit ?? false,
      },
    });
    for (let n = 0; n < (opts.lines ?? 1); n += 1) {
      await prisma.cartItem.create({
        data: {
          cartId,
          kind: "GENERAL_CONSULTATION",
          serviceId: opts.serviceId ?? serviceId,
          name: `Consultation ${n}`,
          unitPriceCents: PRICE,
          quantity: 1,
          shippingCents: 0,
        },
      });
    }
  }

  async function checkout() {
    const response = await app!.inject({
      method: "POST",
      url: "/api/cart/checkout",
      cookies: cookie,
      payload: checkoutBody,
    });
    return { status: response.statusCode, json: response.json() as Record<string, unknown> };
  }

  async function latestOrder() {
    return prisma.order.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  }

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
    } catch {
      return; // app null → skip all
    }

    // A REAL currency code, not a generated one: the paid paths below reach
    // Stripe, which rejects anything outside its own list — a fabricated code
    // turns every non-zero-total case into a 500 that looks like a pricing bug.
    const currency = await prisma.currency.upsert({
      where: { code: "EUR" },
      update: {},
      create: { code: "EUR", symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    currencyCode = currency.code;
    const country = await prisma.country.create({
      data: {
        code: `c${uniq}`.slice(0, 8).toLowerCase(),
        name: `Checkout Test ${uniq}`,
        slug: `checkout-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/chg-${uniq}`,
        teamPath: `/ctm-${uniq}`,
        generalConsultationPath: `/cgn-${uniq}`,
        specialistConsultationPath: `/csp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;
    countryCode = country.code;

    const service = await prisma.service.create({
      data: {
        countryId,
        kind: "GENERAL",
        name: "Checkout GP",
        slug: `checkout-gp-${uniq}`.toLowerCase(),
        basePriceCents: PRICE,
        currencyCode,
      },
    });
    serviceId = service.id;

    const user = await prisma.user.create({
      data: {
        email: checkoutBody.email,
        passwordHash: "x",
        fullName: "Checkout Member",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;
    cookie = { gh_auth: signAuthToken({ sub: user.id, role: "PATIENT", email: user.email }) };
    const cart = await prisma.cart.create({
      data: { userId, countryCode, currencyCode },
    });
    cartId = cart.id;

    // Membership: one included consultation, then 20% off.
    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `checkout-plan-${uniq}`, name: "Checkout Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, slug: "gold", name: "Gold", isDefault: true },
    });
    const benefit = await prisma.membershipBenefit.create({
      data: {
        levelId: level.id,
        planId,
        countryId,
        serviceKind: "GENERAL",
        benefitType: "ALLOWANCE",
        allowanceCount: ALLOWANCE,
        fallbackType: "PERCENT",
        fallbackPercent: 20,
      },
    });
    benefitId = benefit.id;
    const enrollment = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: level.id,
        countryId,
        membershipId: `CHK-${uniq}`.toUpperCase(),
        email: user.email,
        firstName: "Checkout",
        lastName: "Member",
        userId,
        linkedAt: new Date(),
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
      },
    });
    enrollmentId = enrollment.id;

    // A second person's enrollment — the forgery target.
    const other = await prisma.user.create({
      data: {
        email: `checkout-other-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Other Member",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    otherUserId = other.id;
    const otherEnrollment = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: level.id,
        countryId,
        membershipId: `CHK-${uniq}-O`.toUpperCase(),
        email: other.email,
        firstName: "Other",
        lastName: "Member",
        userId: other.id,
        linkedAt: new Date(),
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
      },
    });
    otherEnrollmentId = otherEnrollment.id;

    // A SECOND covered country (§21.1) with its own rule — 50% off, no
    // allowance of its own. This is what makes the pool/governing split
    // observable end to end: in the primary country the two rows are the same
    // row, so nothing here can tell them apart.
    const away = await prisma.country.create({
      data: {
        code: `w${uniq}`.slice(0, 8).toLowerCase(),
        name: `Checkout Away ${uniq}`,
        slug: `checkout-away-${uniq}`.toLowerCase(),
        legacyHomePath: `/whg-${uniq}`,
        teamPath: `/wtm-${uniq}`,
        generalConsultationPath: `/wgn-${uniq}`,
        specialistConsultationPath: `/wsp-${uniq}`,
        currencyId,
      },
    });
    awayCountryId = away.id;
    const awayService = await prisma.service.create({
      data: {
        countryId: awayCountryId,
        kind: "GENERAL",
        name: "Away GP",
        slug: `away-gp-${uniq}`.toLowerCase(),
        basePriceCents: PRICE,
        currencyCode,
      },
    });
    awayServiceId = awayService.id;
    await prisma.membershipPlanCountry.create({
      data: { planId, countryId: awayCountryId },
    });
    const awayBenefit = await prisma.membershipBenefit.create({
      data: {
        levelId: level.id,
        planId,
        countryId: awayCountryId,
        serviceKind: "GENERAL",
        benefitType: "PERCENT",
        percentOff: 50,
      },
    });
    awayBenefitId = awayBenefit.id;

    // Corporate: the same patient is also an active employee with a 25% rule.
    const corporatePlan = await prisma.corporatePlan.create({
      data: {
        slug: `checkout-corp-${uniq}`,
        name: "Checkout Corp",
        annualPricePerEmployeeCents: 10000,
        currencyCode,
      },
    });
    corporatePlanId = corporatePlan.id;
    await prisma.corporateBenefitRule.create({
      data: {
        corporatePlanId,
        serviceKind: "GENERAL",
        discountPercent: CORPORATE_PERCENT,
        appliesToBeneficiaries: true,
      },
    });
    const company = await prisma.corporateCompany.create({
      data: {
        name: `Checkout Co ${uniq}`,
        countryCode,
        billingEmail: `billing-${uniq}@test.local`,
        contactName: "Contact",
        contactEmail: `contact-${uniq}@test.local`,
        planId: corporatePlanId,
        status: "ACTIVE",
      },
    });
    corporateCompanyId = company.id;
    await prisma.corporateEmployee.create({
      data: {
        companyId: corporateCompanyId,
        userId,
        email: user.email,
        firstName: "Checkout",
        lastName: "Member",
        status: "ACTIVE",
      },
    });
  });

  beforeEach(async () => {
    if (!app) return;
    const orders = await prisma.order.findMany({ where: { userId }, select: { id: true } });
    const ids = orders.map((o) => o.id);
    if (ids.length > 0) {
      await prisma.membershipUsageLedger.deleteMany({ where: { orderId: { in: ids } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
      await prisma.order.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.membershipAllowanceBalance.deleteMany({
      where: { benefitId: { in: [benefitId, awayBenefitId] } },
    });
  });

  after(async () => {
    if (!app) return;
    const orders = await prisma.order.findMany({ where: { userId }, select: { id: true } });
    const ids = orders.map((o) => o.id);
    await prisma.membershipUsageLedger.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
    await prisma.membershipAllowanceBalance.deleteMany({
      where: { benefitId: { in: [benefitId, awayBenefitId] } },
    });
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.corporateEmployee.deleteMany({ where: { companyId: corporateCompanyId } });
    await prisma.corporateCompany.deleteMany({ where: { id: corporateCompanyId } });
    await prisma.corporateBenefitRule.deleteMany({ where: { corporatePlanId } });
    await prisma.corporatePlan.deleteMany({ where: { id: corporatePlanId } });
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.service.deleteMany({ where: { countryId: { in: [countryId, awayCountryId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.country.deleteMany({ where: { id: { in: [countryId, awayCountryId] } } });
    // EUR is shared with whatever else the database holds — never delete it.
    await app.close();
  });

  it("NONE suppresses corporate's automatic discount — the phase 5 change", async (t) => {
    if (!app) return t.skip();
    await seedCart("NONE");
    const { status } = await checkout();
    // 503 is fine here and below: the order is created and priced before
    // Stripe is reached, and this test environment has no Stripe key. What is
    // under test is the PRICE on the order, not the payment session.
    assert.ok(status === 200 || status === 503, `unexpected ${status}`);
    const order = await latestOrder();
    assert.equal(order?.totalCents, PRICE);
    assert.equal(order?.items[0]?.corporateDiscountCents, null);
  });

  it("CORPORATE applies the discount the same member did not get under NONE", async (t) => {
    if (!app) return t.skip();
    await seedCart("CORPORATE");
    const { status } = await checkout();
    assert.ok(status === 200 || status === 503, `unexpected ${status}`);
    const order = await latestOrder();
    const expected = PRICE - Math.round((PRICE * CORPORATE_PERCENT) / 100);
    assert.equal(order?.totalCents, expected);
    assert.equal(order?.items[0]?.corporateCompanyId, corporateCompanyId);
  });

  it("MEMBERSHIP runs alone: allowance zeroes the line, corporate stays out", async (t) => {
    if (!app) return t.skip();
    await seedCart("MEMBERSHIP", { membershipEnrollmentId: enrollmentId });
    const { status, json } = await checkout();
    assert.equal(status, 200);
    // €0 → no Stripe session at all (§6.5/§31).
    assert.equal(json.data && (json.data as Record<string, unknown>).url, null);

    const order = await latestOrder();
    assert.equal(order?.totalCents, 0);
    const line = order?.items[0];
    assert.equal(line?.unitPriceCents, 0);
    assert.equal(line?.membershipAllowanceUsed, true);
    assert.equal(line?.membershipEnrollmentId, enrollmentId);
    assert.equal(line?.membershipDiscountCents, PRICE);
    // The corporate engine did not run, even though this patient is eligible.
    assert.equal(line?.corporateDiscountCents, null);

    const ledger = await prisma.membershipUsageLedger.findMany({
      where: { orderId: order!.id },
      select: { delta: true, reason: true },
    });
    assert.deepEqual(ledger, [{ delta: -1, reason: "SPEND" }]);
    const balance = await prisma.membershipAllowanceBalance.findFirst({ where: { benefitId } });
    assert.equal(balance?.used, 1);
  });

  it("spends the allowance on the first line and falls back on the second (§25)", async (t) => {
    if (!app) return t.skip();
    await seedCart("MEMBERSHIP", { lines: 2, membershipEnrollmentId: enrollmentId });
    const { status } = await checkout();
    assert.ok(status === 200 || status === 503, `unexpected ${status}`);

    const order = await latestOrder();
    const prices = order!.items.map((i) => i.unitPriceCents).sort((a, b) => a - b);
    // One unit exists, so line one is free and line two takes the row's 20%.
    assert.deepEqual(prices, [0, PRICE - Math.round((PRICE * 20) / 100)]);
    assert.equal(order!.items.filter((i) => i.membershipAllowanceUsed).length, 1);

    // The counter is the one thing that differs between the two tolerated
    // statuses, so it cannot be asserted unconditionally. This order costs
    // more than zero and therefore needs a Stripe session; with no key
    // configured, orders.route.ts returns its 503 AFTER the order
    // transaction has committed and calls releaseOrderMembershipAllowance()
    // on the way out, deliberately handing the held unit back rather than
    // burning it on a payment that was never started. Asserting used === 1
    // regardless made this pass only where a Stripe key is configured.
    const balance = await prisma.membershipAllowanceBalance.findFirst({ where: { benefitId } });
    const ledger = await prisma.membershipUsageLedger.findMany({
      where: { orderId: order!.id },
      select: { delta: true, reason: true },
      orderBy: { createdAt: "asc" },
    });
    if (status === 200) {
      assert.equal(balance?.used, 1);
      assert.deepEqual(ledger, [{ delta: -1, reason: "SPEND" }]);
    } else {
      // Spent inside the order transaction, then released on the way out.
      assert.equal(balance?.used, 0);
      assert.deepEqual(ledger, [
        { delta: -1, reason: "SPEND" },
        { delta: 1, reason: "REFUND" },
      ]);
    }
  });

  /**
   * §21.4 end to end, and the single most valuable case in phase 7: the member
   * books ABROAD, in a covered country whose own rule is 50% off, while the
   * included visit is defined on the plan's PRIMARY country.
   *
   * Two things have to be true at once, and they involve two different benefit
   * rows. Get them the wrong way round and nothing errors — the pool silently
   * becomes one counter per country, which is exactly what the design exists
   * to prevent.
   */
  it("spends the PRIMARY country's counter for a booking in another covered country", async (t) => {
    if (!app) return t.skip();
    await seedCart("MEMBERSHIP", {
      membershipEnrollmentId: enrollmentId,
      serviceId: awayServiceId,
    });
    const { status } = await checkout();
    assert.equal(status, 200);

    const order = await latestOrder();
    const line = order?.items[0];
    assert.equal(line?.unitPriceCents, 0, "the included visit travels (decision 38)");
    assert.equal(line?.membershipAllowanceUsed, true);
    // The GOVERNING row — the away country's — is what the line records (§21.5b).
    assert.equal(line?.membershipBenefitId, awayBenefitId);

    // …while the counter that moved is the PRIMARY country's row, and the away
    // country has no counter of its own.
    const primaryBalance = await prisma.membershipAllowanceBalance.findFirst({
      where: { benefitId },
    });
    assert.equal(primaryBalance?.used, 1, "one shared pool, spent abroad");
    const awayBalance = await prisma.membershipAllowanceBalance.findFirst({
      where: { benefitId: awayBenefitId },
    });
    assert.equal(awayBalance, null, "no second counter was created per country");
  });

  it("declining the unit abroad charges that country's rule and spends nothing", async (t) => {
    if (!app) return t.skip();
    await seedCart("MEMBERSHIP", {
      membershipEnrollmentId: enrollmentId,
      serviceId: awayServiceId,
      declineUnit: true,
    });
    const { status } = await checkout();
    assert.ok(status === 200 || status === 503, `unexpected ${status}`);

    const order = await latestOrder();
    const line = order?.items[0];
    assert.equal(line?.unitPriceCents, PRICE / 2, "the away country's own 50%");
    assert.equal(line?.membershipAllowanceUsed, false);
    assert.equal(line?.membershipBenefitId, awayBenefitId);
    const primaryBalance = await prisma.membershipAllowanceBalance.findFirst({
      where: { benefitId },
    });
    // Either no counter yet, or one that never moved — the visit is still theirs.
    assert.equal(primaryBalance?.used ?? 0, 0);
  });

  it("rejects a membership that belongs to someone else — never a silent downgrade", async (t) => {
    if (!app) return t.skip();
    await seedCart("MEMBERSHIP", { membershipEnrollmentId: otherEnrollmentId });
    const { status } = await checkout();
    assert.equal(status, 400);
    // Charging full price instead would bill a number the patient never saw.
    const order = await latestOrder();
    assert.equal(order, null);
  });

  it("cannot even store an enrollment id that does not exist", async (t) => {
    if (!app) return t.skip();
    // A wholly invented id never reaches the resolver: `Cart` carries a real
    // foreign key, so the write is refused first. The forgery that IS
    // reachable is a real id belonging to someone else — covered above.
    await assert.rejects(() =>
      prisma.cart.update({
        where: { id: cartId },
        data: { benefitSource: "MEMBERSHIP", membershipEnrollmentId: "enr_does_not_exist" },
      }),
    );
  });

  it("UNSET with an eligible source is rejected, not silently charged full price", async (t) => {
    if (!app) return t.skip();
    await seedCart("UNSET");
    const { status, json } = await checkout();
    assert.equal(status, 400);
    assert.equal((json.details as Record<string, unknown> | undefined)?.code, "BENEFIT_STEP_INCOMPLETE");
    assert.equal(await latestOrder(), null);
  });

  it("UNSET with nothing eligible proceeds as NONE rather than bricking the cart", async (t) => {
    if (!app) return t.skip();
    // Strip both sources for this case: with nothing on offer, the benefit
    // step had nothing to ask, so blocking checkout would punish the patient
    // for a step that would have been empty.
    await prisma.corporateEmployee.updateMany({
      where: { companyId: corporateCompanyId, userId },
      data: { status: "SUSPENDED" },
    });
    await prisma.membershipEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "SUSPENDED" },
    });
    try {
      await seedCart("UNSET");
      const { status } = await checkout();
      assert.ok(status === 200 || status === 503, `unexpected ${status}`);
      const order = await latestOrder();
      assert.equal(order?.totalCents, PRICE);
    } finally {
      await prisma.corporateEmployee.updateMany({
        where: { companyId: corporateCompanyId, userId },
        data: { status: "ACTIVE" },
      });
      await prisma.membershipEnrollment.update({
        where: { id: enrollmentId },
        data: { status: "ACTIVE" },
      });
    }
  });

  it("clears the benefit choice off the cart so the next one does not inherit it", async (t) => {
    if (!app) return t.skip();
    await seedCart("MEMBERSHIP", { membershipEnrollmentId: enrollmentId });
    await checkout();
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      select: { benefitSource: true, membershipEnrollmentId: true },
    });
    // A stale NONE here would suppress this patient's corporate discount on
    // every future order, with nothing in the UI explaining why.
    assert.equal(cart?.benefitSource, "UNSET");
    assert.equal(cart?.membershipEnrollmentId, null);
  });
});
