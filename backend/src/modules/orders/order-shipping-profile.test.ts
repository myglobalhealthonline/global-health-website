import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  saveOrderShippingAddressToProfile,
  type OrderShippingProfileInput,
} from "./order-shipping-profile.service.js";

/**
 * The fill-only contract. A shipping label promoted onto a chart must never
 * overwrite an address a patient or a clinician put there, and must never write
 * half an address.
 */

type Chart = {
  id: string;
  userId: string | null;
  addressLine1: string | null;
  addressCity: string | null;
};

function fakeDb(chart: Chart | null) {
  const calls: { upsert: unknown[]; updateMany: unknown[] } = { upsert: [], updateMany: [] };
  let stored = chart;
  const db = {
    patientProfile: {
      findUnique: async () => stored,
      upsert: async (args: { update: unknown; create: unknown }) => {
        calls.upsert.push(args);
        if (!stored) {
          stored = { id: "new", userId: null, addressLine1: "x", addressCity: "x" };
        }
        return stored;
      },
      updateMany: async (args: unknown) => {
        calls.updateMany.push(args);
        return { count: 1 };
      },
    },
  };
  // The helper only calls these three methods; the Prisma delegate types are
  // far wider, so the cast is the narrowing, not a lie about behaviour.
  return { db: db as unknown as Parameters<typeof saveOrderShippingAddressToProfile>[0], calls };
}

const ORDER: OrderShippingProfileInput = {
  email: "Matthew@Example.com",
  fullName: "Matthew O'Driscoll",
  phone: "+353 879744083",
  userId: "user_1",
  shipName: "Matthew ODriscoll",
  shipLine1: "175 Beechwood Court",
  shipLine2: "Stillorgan",
  shipCity: "Co Dublin",
  shipPostalCode: "A94W4KH",
  shipCountryCode: "IE",
};

describe("saveOrderShippingAddressToProfile", () => {
  it("creates a chart carrying the address when none exists", async () => {
    const { db, calls } = fakeDb(null);
    assert.equal(await saveOrderShippingAddressToProfile(db, ORDER), "created");
    const args = calls.upsert[0] as { create: Record<string, unknown> };
    assert.equal(args.create.addressLine1, "175 Beechwood Court");
    assert.equal(args.create.addressCity, "Co Dublin");
    // Country codes are lowercase on the chart; ship* holds the ISO uppercase.
    assert.equal(args.create.addressCountryCode, "ie");
  });

  it("fills an existing address-less chart", async () => {
    const { db } = fakeDb({ id: "p1", userId: "user_1", addressLine1: null, addressCity: null });
    assert.equal(await saveOrderShippingAddressToProfile(db, ORDER), "filled");
  });

  it("never overwrites an address already on the chart", async () => {
    const { db, calls } = fakeDb({
      id: "p1",
      userId: "user_1",
      addressLine1: "1 Somewhere Else",
      addressCity: null,
    });
    assert.equal(await saveOrderShippingAddressToProfile(db, ORDER), "already-addressed");
    assert.equal(calls.upsert.length, 0);
  });

  it("treats a city-only chart as already addressed", async () => {
    const { db, calls } = fakeDb({ id: "p1", userId: null, addressLine1: null, addressCity: "Lisboa" });
    assert.equal(await saveOrderShippingAddressToProfile(db, ORDER), "already-addressed");
    assert.equal(calls.upsert.length, 0);
  });

  it("skips a partial address rather than writing half of one", async () => {
    const { db, calls } = fakeDb(null);
    assert.equal(
      await saveOrderShippingAddressToProfile(db, { ...ORDER, shipCity: null }),
      "no-address",
    );
    assert.equal(calls.upsert.length, 0);
  });

  it("skips an order with no email to key the chart by", async () => {
    const { db } = fakeDb(null);
    assert.equal(await saveOrderShippingAddressToProfile(db, { ...ORDER, email: "  " }), "no-email");
  });

  it("claims an unowned chart for the ordering account", async () => {
    const { db, calls } = fakeDb({ id: "p1", userId: null, addressLine1: null, addressCity: null });
    await saveOrderShippingAddressToProfile(db, ORDER);
    const args = calls.updateMany[0] as { where: Record<string, unknown> };
    // `userId: null` in the predicate is what makes this a claim, not a move.
    assert.deepEqual(args.where, { id: "p1", userId: null });
  });

  it("never re-points a chart that belongs to another account", async () => {
    const { db, calls } = fakeDb({
      id: "p1",
      userId: "someone_else",
      addressLine1: null,
      addressCity: null,
    });
    await saveOrderShippingAddressToProfile(db, ORDER);
    assert.equal(calls.updateMany.length, 0);
  });
});
