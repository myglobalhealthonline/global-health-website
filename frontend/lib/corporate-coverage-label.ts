import { formatPrice } from "./format-currency";
import type { CorporateDiscountInfo } from "./api/me-subscription";

/**
 * How a corporate-covered line reads to the patient, in one place — the cart
 * chip, the checkout summary row and the coverage card must not describe the
 * same line differently.
 *
 * A co-pay is a FIXED amount, so it is stated as the amount rather than as a
 * percentage: the percentage of a €20 co-pay changes with every service price,
 * and quoting it invites the reader to do the wrong arithmetic.
 *
 * Returns the short form only ("−15%", "you pay €20.00", "included with your
 * plan"). Callers that also show the saved amount keep doing so themselves —
 * that figure lives in their own layout, not in this label.
 */
export function corporateCoverageLabel(
  discount: Pick<CorporateDiscountInfo, "coverage" | "copayCents" | "percent">,
  currencyCode: string,
  copy: { copay: string; included: string },
): string {
  if (discount.coverage === "INCLUDED") return copy.included;
  if (discount.coverage === "COPAY" && discount.copayCents != null) {
    return copy.copay.replace("{amount}", formatPrice(discount.copayCents, currencyCode));
  }
  return `−${discount.percent}%`;
}
