import { prisma } from "../../db/prisma.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";

/**
 * Commission billing model — used by markets where Global Health is an
 * INTERMEDIARY rather than the treating provider (Brazil at launch, switched on
 * per country via `Country.commissionReceiptEnabled`).
 *
 * The money split:
 *
 *   patient card charge   = Order.totalCents          (unchanged — full price)
 *   doctor payout         = ServiceDoctor.doctorAmountCents, per unit
 *   Global Health commission = charge − payout        ← what our receipt is FOR
 *
 * The fiscal document we issue shows ONLY the commission. The treating doctor
 * documents their own fee separately. See invoice-pdf.ts for the rendering side.
 *
 * ── Payout precedence (mirrors doctorPayoutStatementReport in report-datasets.ts) ──
 *
 *   insurance line → ServiceDoctorInsurancePayout for (company, service, doctor),
 *                    with NO fallback to the standard payout. An unset insurance
 *                    payout means "this doctor doesn't take this insurer for this
 *                    service", which is a different statement from "payout is 0".
 *   otherwise      → ServiceDoctor.doctorAmountCents for (service, doctor).
 *
 * Keeping the two in step matters: if this module and the payout statement ever
 * disagree, the doctor is invoiced for one number and paid another.
 *
 * ── Lines with no doctor ──
 *
 * Health tests, products, prescriptions and lab exams have no treating doctor, so
 * there is no payout to carve out and the whole line total is commission. Same for
 * shipping, which is our logistics rather than the doctor's work.
 *
 * ── Deliberately NOT cached ──
 *
 * `isCommissionCountry` hits the DB per call, matching `readBookingSettings` in
 * cart.route.ts. A stale cache here would mis-price a fiscal document, and the
 * Country table is tiny.
 */

/** Order/cart line shape this module needs. Structural, so both CartItem and OrderItem fit. */
export type CommissionLineInput = {
  /** Stable identifier for diagnostics — cart item id or order item id. */
  id?: string;
  serviceId?: string | null;
  doctorId?: string | null;
  insuranceCompanyId?: string | null;
  quantity: number;
  /** Final per-unit price, already net of peak/insurance/corporate/credit adjustments. */
  unitPriceCents: number;
  /**
   * Per-unit payout supplied by the caller, bypassing the ServiceDoctor lookup.
   *
   * For flows whose payout does not live on a (service, doctor) pair — currently
   * cross-border prescriptions, which price off `DoctorCrossBorderRxCountry` and
   * create an order line carrying neither id. Passing a number here also marks the
   * line as "payout known", so it never trips the missing-payout alert.
   *
   * `undefined` = no override, do the normal lookup.
   */
  payoutOverrideCents?: number;
};

export type CommissionLineResult = {
  id?: string;
  /** Per-unit doctor payout. Null when the line has no doctor at all. */
  doctorPayoutCents: number | null;
  /** lineTotal − payout × quantity, clamped at ≥ 0. */
  commissionCents: number;
};

export type OrderCommissionResult = {
  lines: CommissionLineResult[];
  commissionTotalCents: number;
  doctorPayoutTotalCents: number;
};

/**
 * True when this market issues commission-only fiscal documents.
 * Unknown / missing country → false, i.e. the standard full-price receipt. A
 * lookup failure must never silently flip a market into commission mode.
 */
export async function isCommissionCountry(countryCode: string | null | undefined): Promise<boolean> {
  const code = countryCode?.trim().toLowerCase();
  if (!code) return false;
  const country = await prisma.country.findFirst({
    // Country codes are stored lowercase, but match insensitively — an
    // upper-cased code silently returns null on an exact match.
    where: { code: { equals: code, mode: "insensitive" } },
    select: { commissionReceiptEnabled: true },
  });
  return country?.commissionReceiptEnabled ?? false;
}

/**
 * Resolve the per-unit doctor payout for one line.
 *
 * Returns `null` for "no payout configured" — which the caller must treat as a
 * blocking condition in a commission country (see `assertPayoutConfigured`),
 * NOT as zero. Zero would silently bill the entire service price as commission.
 */
export async function resolveLinePayoutCents(input: {
  serviceId?: string | null;
  doctorId?: string | null;
  insuranceCompanyId?: string | null;
}): Promise<number | null> {
  const { serviceId, doctorId, insuranceCompanyId } = input;
  if (!serviceId || !doctorId) return null;

  if (insuranceCompanyId) {
    const row = await prisma.serviceDoctorInsurancePayout.findUnique({
      where: {
        insuranceCompanyId_serviceId_doctorId: { insuranceCompanyId, serviceId, doctorId },
      },
      select: { doctorAmountCents: true },
    });
    // No fallback to the standard payout — see the precedence note above.
    return row?.doctorAmountCents ?? null;
  }

  const row = await prisma.serviceDoctor.findUnique({
    where: { serviceId_doctorId: { serviceId, doctorId } },
    select: { doctorAmountCents: true },
  });
  return row?.doctorAmountCents ?? null;
}

/**
 * True when this line needs a configured payout before it can be sold in a
 * commission market: it names a doctor, so someone is owed a fee.
 */
export function lineRequiresPayout(line: {
  serviceId?: string | null;
  doctorId?: string | null;
}): boolean {
  return Boolean(line.serviceId && line.doctorId);
}

/**
 * Booking guard for commission markets. Returns true when the (service, doctor)
 * pair is sellable — i.e. it has a payout configured, so a commission can be
 * derived from the price.
 *
 * Called from the cart add path and again from the checkout recompute, the same
 * two places `isDoctorInInsuranceNetwork` is enforced.
 */
export async function isLineSellableInCommissionMarket(input: {
  countryCode: string;
  serviceId?: string | null;
  doctorId?: string | null;
  insuranceCompanyId?: string | null;
}): Promise<boolean> {
  if (!(await isCommissionCountry(input.countryCode))) return true;
  if (!lineRequiresPayout(input)) return true;
  return (await resolveLinePayoutCents(input)) != null;
}

/**
 * Batch form of the booking guard, for the checkout recompute. Returns the first
 * line that cannot be sold, or null when every line is fine.
 *
 * The cart already blocks these at add-to-cart time; this is the anti-tamper
 * re-check on the way to Stripe, mirroring how `computeEffectivePrices` re-derives
 * prices rather than trusting the cart snapshot. A payout can also be un-set by an
 * admin between add-to-cart and checkout, which this catches.
 *
 * Kept out of `computeEffectivePrices` on purpose: that function returns a price
 * map and has no failure channel, so folding a rejection into it would change its
 * contract for every caller including the read-only price preview.
 */
export async function findUnsellableCommissionLine(
  countryCode: string,
  lines: Array<{ id?: string; serviceId?: string | null; doctorId?: string | null; insuranceCompanyId?: string | null }>,
): Promise<{ id?: string; serviceId?: string | null; doctorId?: string | null } | null> {
  if (!(await isCommissionCountry(countryCode))) return null;
  for (const line of lines) {
    if (!lineRequiresPayout(line)) continue;
    if ((await resolveLinePayoutCents(line)) == null) return line;
  }
  return null;
}

/**
 * Compute per-line payout/commission plus the order rollups.
 *
 * Shipping is passed separately because it is an order-level amount in this
 * codebase (`Order.shippingCents`), not a line, and it is 100% commission.
 *
 * Invariant on the result: commissionTotalCents + doctorPayoutTotalCents equals
 * the order total (Σ lineTotals + shipping), because every cent is either the
 * doctor's or ours.
 */
export async function computeOrderCommission(
  lines: CommissionLineInput[],
  shippingCents: number,
  context?: { orderId?: string; countryCode?: string },
): Promise<OrderCommissionResult> {
  const results: CommissionLineResult[] = [];
  let commissionTotalCents = shippingCents;
  let doctorPayoutTotalCents = 0;

  for (const line of lines) {
    const lineTotalCents = line.unitPriceCents * line.quantity;
    const payoutPerUnit =
      line.payoutOverrideCents !== undefined
        ? line.payoutOverrideCents
        : await resolveLinePayoutCents(line);

    if (payoutPerUnit == null) {
      // No doctor on the line (health test, product, lab exam) → the whole line
      // is ours. For a line that DOES name a doctor this branch means the payout
      // was never configured, which the booking guard should already have
      // blocked; alert rather than quietly bill 100% commission.
      if (lineRequiresPayout(line)) {
        void emitOpsAlert({
          severity: "critical",
          title: "Commission order line has no configured doctor payout",
          detail:
            "The full line total was booked as commission. Set the payout on the " +
            "service↔doctor assignment and re-check this order before paying the doctor.",
          context: { ...context, lineId: line.id, serviceId: line.serviceId, doctorId: line.doctorId },
        });
      }
      results.push({ id: line.id, doctorPayoutCents: null, commissionCents: lineTotalCents });
      commissionTotalCents += lineTotalCents;
      continue;
    }

    const payoutTotal = payoutPerUnit * line.quantity;
    const rawCommission = lineTotalCents - payoutTotal;

    if (rawCommission < 0) {
      // Payout exceeds the price — reachable via an off-peak or negotiated
      // insurance price that dropped below a payout set against the base price.
      // Clamp so we never issue a negative receipt, and alert: this line loses money.
      void emitOpsAlert({
        severity: "critical",
        title: "Doctor payout exceeds the price charged",
        detail:
          `Line total ${lineTotalCents} < payout ${payoutTotal}. Commission clamped to 0; ` +
          "the order is being sold at a loss.",
        context: { ...context, lineId: line.id, serviceId: line.serviceId, doctorId: line.doctorId },
      });
    }

    const commissionCents = Math.max(0, rawCommission);
    results.push({ id: line.id, doctorPayoutCents: payoutPerUnit, commissionCents });
    commissionTotalCents += commissionCents;
    doctorPayoutTotalCents += payoutTotal;
  }

  return { lines: results, commissionTotalCents, doctorPayoutTotalCents };
}
