import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { priceCorporateInvoiceLine } from "./corporate-invoice.service.js";

describe("priceCorporateInvoiceLine (corporate billing document money rule)", () => {
  it("a divisible amount prices the line so quantity × unit == total", () => {
    const result = priceCorporateInvoiceLine(900_000, 50); // 50 employees × €180
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.unitPriceCents, 18_000);
    assert.equal(result.unitPriceCents * result.quantity, result.amountCents);
  });

  it("refuses an amount that cannot divide evenly instead of rounding it away", () => {
    // The old code rounded to 3333/unit and shipped a 9999 line against a
    // 10000 total — an invoice that does not add up to what it charges.
    const result = priceCorporateInvoiceLine(10_000, 3);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /does not divide evenly/);
  });

  it("quantity 1 always prices, and zero/negative amounts are rejected", () => {
    const single = priceCorporateInvoiceLine(10_000, 1);
    assert.equal(single.ok, true);
    assert.equal(priceCorporateInvoiceLine(0, 1).ok, false);
    assert.equal(priceCorporateInvoiceLine(-500, 1).ok, false);
  });
});
