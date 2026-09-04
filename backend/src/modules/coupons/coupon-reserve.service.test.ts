import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";

/**
 * The redemption cap, against a REAL database — the only way to test it.
 *
 * `reserveCouponSlot` is one conditional UPDATE precisely because a mocked
 * counter proves nothing: the property under test is that two concurrent
 * checkouts against a coupon with one use left produce exactly one winner, and
 * that only holds if the comparison happens inside the database.
 *
 * Skips when Postgres is unreachable, matching the other route/DB suites.
 */
describe("coupon redemption cap", () => {
  let prisma: PrismaClient;
  let svc: typeof import("./coupon-reserve.service.js");
  let release: typeof import("./coupon-release.service.js");
  let available = false;
  const codes: string[] = [];

  before(async () => {
    try {
      ({ prisma } = await import("../../db/prisma.js"));
      svc = await import("./coupon-reserve.service.js");
      release = await import("./coupon-release.service.js");
      await prisma.$queryRaw`SELECT 1`;
      available = true;
    } catch {
      available = false;
    }
  });

  after(async () => {
    if (!available) return;
    if (codes.length > 0) {
      await prisma.coupon.deleteMany({ where: { code: { in: codes } } });
    }
    await prisma.$disconnect();
  });

  async function makeCoupon(maxRedemptions: number, overrides: Record<string, unknown> = {}) {
    const code = `TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    codes.push(code);
    return prisma.coupon.create({
      data: {
        code,
        kind: "GENERAL",
        discountPercent: 20,
        validFrom: new Date(Date.now() - 60_000),
        validUntil: new Date(Date.now() + 60_000),
        maxRedemptions,
        ...overrides,
      },
    });
  }

  it("lets exactly one of many concurrent claims win the last use", async (t) => {
    if (!available) return t.skip();
    const coupon = await makeCoupon(1);

    // Fired together on purpose: a read-then-write implementation passes a
    // sequential version of this test and fails this one.
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        svc.reserveCouponSlot(prisma, { couponId: coupon.id, now: new Date() }),
      ),
    );

    assert.equal(results.filter(Boolean).length, 1, "exactly one claim may succeed");
    const after = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    assert.equal(after?.redeemedCount, 1);
  });

  it("refuses a claim once the cap is full", async (t) => {
    if (!available) return t.skip();
    const coupon = await makeCoupon(2);
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: coupon.id, now: new Date() }), true);
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: coupon.id, now: new Date() }), true);
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: coupon.id, now: new Date() }), false);
  });

  it("refuses a claim on a disabled coupon", async (t) => {
    if (!available) return t.skip();
    const coupon = await makeCoupon(5, { active: false });
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: coupon.id, now: new Date() }), false);
  });

  it("refuses a claim outside the validity window", async (t) => {
    if (!available) return t.skip();
    // The window is re-asserted inside the UPDATE, which is what makes
    // "expired between Apply and Pay" impossible rather than merely unlikely.
    const expired = await makeCoupon(5, {
      validFrom: new Date(Date.now() - 120_000),
      validUntil: new Date(Date.now() - 60_000),
    });
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: expired.id, now: new Date() }), false);

    const future = await makeCoupon(5, {
      validFrom: new Date(Date.now() + 60_000),
      validUntil: new Date(Date.now() + 120_000),
    });
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: future.id, now: new Date() }), false);
  });

  it("gives the use back on release, and a double release is a no-op", async (t) => {
    if (!available) return t.skip();
    const coupon = await makeCoupon(1);
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: coupon.id, now: new Date() }), true);

    await svc.releaseCouponSlotUnchecked(coupon.id);
    assert.equal((await prisma.coupon.findUnique({ where: { id: coupon.id } }))?.redeemedCount, 0);

    // Guarded by `redeemedCount > 0`, so a second release cannot drive the
    // counter negative past the CHECK constraint.
    await svc.releaseCouponSlotUnchecked(coupon.id);
    assert.equal((await prisma.coupon.findUnique({ where: { id: coupon.id } }))?.redeemedCount, 0);
  });

  it("releaseCouponRedemption is idempotent across racing cancel paths", async (t) => {
    if (!available) return t.skip();
    const coupon = await makeCoupon(3);
    assert.equal(await svc.reserveCouponSlot(prisma, { couponId: coupon.id, now: new Date() }), true);

    // A redemption row with no order would violate the FK, so this case is
    // covered by the checkout route test; here we assert the no-op branch,
    // which is what the four racing cancel callers actually rely on.
    assert.equal(await release.releaseCouponRedemption("no-such-order", "test"), "no-op");
    assert.equal((await prisma.coupon.findUnique({ where: { id: coupon.id } }))?.redeemedCount, 1);
  });
});
