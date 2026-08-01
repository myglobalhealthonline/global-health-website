import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

/**
 * Regression tests for the guest→user cart merge that runs on login
 * (`resolveActiveCart` → `mergeCarts`).
 *
 * 1. The merge used to COPY each guest item into the user's cart and only
 *    delete the guest cart afterwards. `CartItem.timeSlotId` is @unique
 *    across the whole table, so for the duration of the copy two rows held
 *    the same slot — every guest who picked a consultation time and then
 *    logged in got a raw P2002 500 ("Unique constraint failed on the fields:
 *    (`timeSlotId`)"). Items are re-parented now, so the id never duplicates.
 *
 * 2. The frontend fires several cart calls in parallel right after login, so
 *    two merges of the same guest cart could interleave and double-count a
 *    dupe-merged quantity. A one-shot claim on `Cart.cookieToken` plus a
 *    single transaction makes the second call a no-op.
 *
 * Fixtures touch Cart/CartItem only: `Cart.userId`, `CartItem.timeSlotId` and
 * `CartItem.doctorId` are bare scalars with no FK, so no user/doctor/slot rows
 * are needed. Cleanup deletes carts by explicit id (items cascade) — never a
 * bare deleteMany, see test-guard.ts.
 */
describe("mergeCarts (guest cart → user cart on login)", () => {
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let mergeCarts: typeof import("./cart.route.js")["mergeCarts"];
  let bootError: unknown = null;
  const createdCartIds: string[] = [];

  before(async () => {
    try {
      prisma = (await import("../db/prisma.js")).prisma;
      mergeCarts = (await import("./cart.route.js")).mergeCarts;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    for (const id of createdCartIds) {
      await prisma.cart.delete({ where: { id } }).catch(() => undefined);
    }
  });

  const skip = (): boolean => Boolean(bootError);

  async function guestCart(countryCode: string) {
    const cart = await prisma.cart.create({
      data: { cookieToken: randomUUID(), countryCode, currencyCode: "EUR" },
    });
    createdCartIds.push(cart.id);
    return cart;
  }

  async function userCart(countryCode: string) {
    const cart = await prisma.cart.create({
      data: { userId: randomUUID(), countryCode, currencyCode: countryCode ? "EUR" : "" },
    });
    createdCartIds.push(cart.id);
    return cart;
  }

  function consultationLine(cartId: string, timeSlotId: string) {
    return prisma.cartItem.create({
      data: {
        cartId,
        kind: "GENERAL_CONSULTATION",
        serviceId: `svc-${randomUUID()}`,
        name: "GP consultation",
        unitPriceCents: 4900,
        quantity: 1,
        timeSlotId,
        doctorId: `doc-${randomUUID()}`,
        heldUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }

  function productLine(cartId: string, serviceId: string, quantity: number) {
    return prisma.cartItem.create({
      data: {
        cartId,
        kind: "HEALTH_TEST",
        serviceId,
        name: "Blood panel",
        unitPriceCents: 3900,
        quantity,
      },
    });
  }

  it("moves a consultation line into the user cart without tripping the unique timeSlotId", async (t) => {
    if (skip()) return t.skip(`DB unavailable: ${String(bootError)}`);

    const guest = await guestCart("ie");
    const target = await userCart(""); // getOrCreateUserCart starts with no country
    const slotId = `slot-${randomUUID()}`;
    await consultationLine(guest.id, slotId);

    // Used to throw PrismaClientKnownRequestError P2002 here.
    await mergeCarts(guest.id, target.id);

    const merged = await prisma.cart.findUnique({
      where: { id: target.id },
      include: { items: true },
    });
    assert.equal(merged?.items.length, 1);
    assert.equal(merged?.items[0]?.timeSlotId, slotId);
    // Empty target inherits the guest cart's country/currency.
    assert.equal(merged?.countryCode, "ie");
    assert.equal(merged?.currencyCode, "EUR");
    // Exactly one row holds the slot — a copy would have left two.
    assert.equal(await prisma.cartItem.count({ where: { timeSlotId: slotId } }), 1);
    assert.equal(await prisma.cart.findUnique({ where: { id: guest.id } }), null);
  });

  it("counts a dupe-merged quantity once when two merges race", async (t) => {
    if (skip()) return t.skip(`DB unavailable: ${String(bootError)}`);

    const guest = await guestCart("ie");
    const target = await userCart("ie");
    const serviceId = `svc-${randomUUID()}`;
    await productLine(guest.id, serviceId, 2);
    await productLine(target.id, serviceId, 1);

    // Two parallel post-login cart calls, same guest cart.
    await Promise.all([mergeCarts(guest.id, target.id), mergeCarts(guest.id, target.id)]);

    const merged = await prisma.cart.findUnique({
      where: { id: target.id },
      include: { items: true },
    });
    assert.equal(merged?.items.length, 1);
    // 1 + 2 applied once. Applied twice it would read 5 (capped) or 4.
    assert.equal(merged?.items[0]?.quantity, 3);
    assert.equal(await prisma.cart.findUnique({ where: { id: guest.id } }), null);
  });

  it("drops the guest items when the user cart is for another country", async (t) => {
    if (skip()) return t.skip(`DB unavailable: ${String(bootError)}`);

    const guest = await guestCart("ie");
    const target = await userCart("pt");
    await consultationLine(guest.id, `slot-${randomUUID()}`);
    await productLine(target.id, `svc-${randomUUID()}`, 1);

    await mergeCarts(guest.id, target.id);

    const merged = await prisma.cart.findUnique({
      where: { id: target.id },
      include: { items: true },
    });
    // Mixing currencies is refused — the target keeps only what it had.
    assert.equal(merged?.items.length, 1);
    assert.equal(merged?.countryCode, "pt");
    assert.equal(await prisma.cart.findUnique({ where: { id: guest.id } }), null);
  });
});
