/**
 * Coupon money math.
 *
 * THE RULE: derive the aggregate from the lines, never the lines from an
 * aggregate. Rounding happens once per UNIT, before the quantity multiply, so
 * there is never a residual to redistribute and these invariants hold exactly:
 *
 *   lineTotalCents          === unitPriceCents * quantity
 *   Order.subtotalCents     === Σ OrderItem.lineTotalCents
 *   Order.couponDiscountCents === Σ OrderItem.couponDiscountCents
 *
 * The first one is load-bearing: `invoice-pdf.ts` and the InvoiceExpress
 * issuer both re-derive line totals from the unit price, so a cart of quantity
 * 3 whose line total was rounded as a lump would print an invoice that does not
 * add up.
 *
 * Computing `round(subtotal * pct / 100)` and splitting it across lines is the
 * tempting alternative and is wrong for exactly that reason. Don't.
 *
 * Shipping is never discounted — the percentage is off the booking, not off
 * delivery. The coupon email says so.
 */

/** Half-up, matching the admin discretionary discount in manual-booking.service.ts. */
export function couponCutPerUnit(grossUnitCents: number, discountPercent: number): number {
  if (discountPercent <= 0 || grossUnitCents <= 0) return 0;
  return Math.round((grossUnitCents * discountPercent) / 100);
}

export type CouponLineResult = {
  /** What the patient pays per unit, already net of the coupon. */
  netUnitCents: number;
  /** `netUnitCents * quantity` — exact, no second rounding. */
  lineTotalCents: number;
  /** Audit only: what the coupon took off this whole line. */
  lineCutCents: number;
};

export function applyCouponToLine(
  grossUnitCents: number,
  quantity: number,
  discountPercent: number,
): CouponLineResult {
  const cut = couponCutPerUnit(grossUnitCents, discountPercent);
  const netUnitCents = grossUnitCents - cut;
  return {
    netUnitCents,
    lineTotalCents: netUnitCents * quantity,
    lineCutCents: cut * quantity,
  };
}

/**
 * Sum a whole cart. `lines` carry the GROSS unit price the rest of the pricing
 * chain resolved; the coupon is the last layer.
 */
export function applyCouponToCart(
  lines: ReadonlyArray<{ grossUnitCents: number; quantity: number }>,
  discountPercent: number,
): {
  subtotalCents: number;
  discountCents: number;
  lines: CouponLineResult[];
} {
  const results = lines.map((l) => applyCouponToLine(l.grossUnitCents, l.quantity, discountPercent));
  return {
    subtotalCents: results.reduce((s, r) => s + r.lineTotalCents, 0),
    discountCents: results.reduce((s, r) => s + r.lineCutCents, 0),
    lines: results,
  };
}
