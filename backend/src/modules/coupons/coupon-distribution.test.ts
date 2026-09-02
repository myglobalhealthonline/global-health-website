import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCouponToCart, applyCouponToLine, couponCutPerUnit } from "./coupon-distribution.js";

/**
 * Pure math, zero DB. These invariants are what keeps an invoice adding up:
 * every fiscal document re-derives line totals from the unit price, so a cut
 * rounded at the wrong level prints a document whose lines do not sum to its
 * total.
 */
describe("couponCutPerUnit", () => {
  it("rounds half-up on an odd price", () => {
    // 7% of 1999 = 139.93
    assert.equal(couponCutPerUnit(1999, 7), 140);
  });

  it("never returns a cut on a zero-priced line", () => {
    assert.equal(couponCutPerUnit(0, 100), 0);
  });

  it("rounds a sub-cent cut down to nothing rather than negative", () => {
    assert.equal(couponCutPerUnit(1, 1), 0);
  });

  it("takes everything at 100%", () => {
    assert.equal(couponCutPerUnit(4500, 100), 4500);
  });

  it("treats a non-positive percent as no discount", () => {
    assert.equal(couponCutPerUnit(4500, 0), 0);
  });
});

describe("applyCouponToLine", () => {
  it("keeps lineTotal === unitPrice * quantity on a multi-unit odd price", () => {
    const line = applyCouponToLine(1999, 3, 7);
    assert.equal(line.netUnitCents, 1859);
    assert.equal(line.lineTotalCents, 5577);
    assert.equal(line.lineCutCents, 420);
    assert.equal(line.lineTotalCents, line.netUnitCents * 3);
  });

  it("zeroes the line at 100% off", () => {
    const line = applyCouponToLine(4500, 2, 100);
    assert.equal(line.netUnitCents, 0);
    assert.equal(line.lineTotalCents, 0);
    assert.equal(line.lineCutCents, 9000);
  });

  it("leaves a zero-priced line alone", () => {
    const line = applyCouponToLine(0, 1, 50);
    assert.deepEqual(line, { netUnitCents: 0, lineTotalCents: 0, lineCutCents: 0 });
  });
});

describe("applyCouponToCart", () => {
  it("derives the aggregate from the lines", () => {
    const cart = applyCouponToCart(
      [
        { grossUnitCents: 1999, quantity: 3 },
        { grossUnitCents: 4500, quantity: 1 },
        { grossUnitCents: 0, quantity: 2 },
      ],
      7,
    );
    assert.equal(cart.subtotalCents, 5577 + 4185);
    assert.equal(cart.discountCents, 420 + 315);
    assert.equal(
      cart.subtotalCents,
      cart.lines.reduce((s, l) => s + l.lineTotalCents, 0),
    );
  });

  it("holds every invariant across randomised carts", () => {
    let seed = 0x5eed;
    const rand = (max: number) => {
      // xorshift — deterministic, so a failure is reproducible.
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return Math.abs(seed) % max;
    };

    for (let run = 0; run < 500; run += 1) {
      const pct = 1 + rand(100);
      const lines = Array.from({ length: 1 + rand(5) }, () => ({
        grossUnitCents: rand(50_000),
        quantity: 1 + rand(4),
      }));
      const cart = applyCouponToCart(lines, pct);

      assert.equal(
        cart.subtotalCents,
        cart.lines.reduce((s, l) => s + l.lineTotalCents, 0),
        "subtotal must be the sum of the line totals",
      );
      assert.equal(
        cart.discountCents,
        cart.lines.reduce((s, l) => s + l.lineCutCents, 0),
        "order discount must be the sum of the line cuts",
      );
      cart.lines.forEach((l, i) => {
        assert.equal(
          l.lineTotalCents,
          l.netUnitCents * lines[i]!.quantity,
          "line total must stay unit * quantity",
        );
        assert.ok(l.netUnitCents >= 0, "a net unit price can never go negative");
        assert.equal(
          l.netUnitCents + couponCutPerUnit(lines[i]!.grossUnitCents, pct),
          lines[i]!.grossUnitCents,
          "net + cut must reconstruct the gross unit price",
        );
      });
    }
  });
});
