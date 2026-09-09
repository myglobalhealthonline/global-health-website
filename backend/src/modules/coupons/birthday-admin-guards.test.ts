import assert from "node:assert/strict";
import { before, it, mock } from "node:test";

let writes = 0;
let service: typeof import("./coupon-admin.service.js");
before(async () => {
  mock.module("../../db/prisma.js", { namedExports: { prisma: {
    birthdayOffer: { findUnique: async ({ where }: { where: { couponId: string } }) => where.couponId === "birthday" ? { id: "offer" } : null },
    coupon: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id, redeemedCount: 0, validFrom: new Date("2026-09-09"), validUntil: new Date("2026-10-09"),
        birthdayOffer: where.id === "birthday" ? { id: "offer" } : null,
      }),
      update: async () => { writes++; return { id: "updated" }; },
    },
    couponRecipient: {
      createMany: async () => { writes++; return { count: 1 }; },
      findMany: async () => [],
    },
  } } });
  mock.module("./coupon-emails.js", { namedExports: { resolveCouponRecipientLocale: async () => "EN", sendCouponEmail: async () => { throw new Error("Unexpected send"); } } });
  service = await import("./coupon-admin.service.js");
});

it("manual coupon actions cannot bypass birthday consent/deduplication or raise the single-use cap", async () => {
  writes = 0;
  await assert.rejects(service.addCouponRecipients("birthday", [{ email: "other@example.test" }]), service.BirthdayCouponManagedError);
  await assert.rejects(service.sendCouponEmails("birthday"), service.BirthdayCouponManagedError);
  await assert.rejects(service.updateCoupon("birthday", { maxRedemptions: 2 }), service.BirthdayCouponManagedError);
  assert.equal(writes, 0);
  await service.updateCoupon("birthday", { active: false });
  assert.equal(writes, 1);
});

it("keeps ordinary coupons editable and sendable through their existing path", async () => {
  writes = 0;
  await service.updateCoupon("ordinary", { maxRedemptions: 5 });
  assert.deepEqual(await service.addCouponRecipients("ordinary", [{ email: "other@example.test" }]), { added: 1 });
  assert.deepEqual(await service.sendCouponEmails("ordinary"), { sent: 0, failed: 0 });
  assert.equal(writes, 2);
});
