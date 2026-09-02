/**
 * Stripe rejects a Checkout line below its published per-currency minimum, so a
 * discount landing between zero and this floor would mint a booking whose
 * payment link is dead on arrival. Minor units, keyed by ISO currency; the
 * fallback covers any currency added to a country before this map is updated.
 *
 * Extracted from `manual-booking.service.ts` when coupons arrived — the website
 * checkout needs the identical floor, and two copies of a money constant drift.
 *
 * A total of exactly zero is NOT a violation: a fully covered or 100%-discounted
 * order takes the free path and never reaches Stripe.
 */
const STRIPE_MIN_CHARGE_CENTS: Record<string, number> = {
  EUR: 50,
  GBP: 30,
  USD: 50,
  CHF: 50,
  CZK: 1500,
  PLN: 200,
  RON: 200,
  HUF: 17_500,
  SEK: 300,
  DKK: 250,
  NOK: 300,
  BGN: 100,
};

export function minimumChargeCents(currencyCode: string): number {
  return STRIPE_MIN_CHARGE_CENTS[currencyCode.trim().toUpperCase()] ?? 50;
}

/** True when `totalCents` is chargeable: either free, or at/above the floor. */
export function isChargeableTotal(totalCents: number, currencyCode: string): boolean {
  return totalCents === 0 || totalCents >= minimumChargeCents(currencyCode);
}
