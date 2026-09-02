/**
 * Clinical director commission terms and the band arithmetic.
 *
 * Deliberately free of any DB or env import so the money maths can be unit
 * tested on its own — the report that consumes it pulls in Prisma, which drags
 * in the whole env schema.
 */

/**
 * A clinical director's commission agreement for one market. The tiers apply to
 * the GROSS amount the patients paid — never to what the doctors are paid out.
 *
 * Both current agreements are two-band: a higher rate up to a threshold, a
 * lower rate on everything above it.
 */
export type ClinicalDirectorTerms = {
  /** Market the director covers (`Appointment.countryCode`, lower-case). */
  countryCode: string;
  /** Market label for the statement heading. */
  marketLabel: string;
  /** Currency the threshold is expressed in — and the only currency the
   *  commission is calculated for. Anything invoiced in another currency is
   *  listed separately and left out, rather than silently converted at a rate
   *  nobody agreed. */
  currencyCode: string;
  /** Gross invoiced, in minor units, up to which `topRate` applies. */
  thresholdCents: number;
  /** Rate on the first `thresholdCents` (0.15 = 15%). */
  topRate: number;
  /** Rate on everything above the threshold. */
  aboveRate: number;
};

/**
 * The agreed terms, keyed by market. Only markets listed here can be run: a
 * doctor holding `directorAccess` is not by itself a commission arrangement,
 * so Ireland and Portugal are deliberately absent even though a doctor holds
 * director access on both.
 *
 * Thresholds are per STATEMENT PERIOD — the statement is the director's
 * commission for that month, so each month starts at the top band again.
 */
export const CLINICAL_DIRECTOR_TERMS: Record<string, ClinicalDirectorTerms> = {
  cz: {
    countryCode: "cz",
    marketLabel: "Czechia",
    currencyCode: "CZK",
    thresholdCents: 490_000_000, // 4,900,000 CZK
    topRate: 0.15,
    aboveRate: 0.1,
  },
  ro: {
    countryCode: "ro",
    marketLabel: "Romania",
    currencyCode: "EUR",
    thresholdCents: 20_000_000, // 200,000 EUR
    topRate: 0.15,
    aboveRate: 0.1,
  },
};

/** Split a gross total across the two bands and return the commission due. */
export function clinicalDirectorCommission(
  grossCents: number,
  terms: ClinicalDirectorTerms,
): { topFee: number; aboveFee: number; total: number } {
  const inTopBand = Math.min(Math.max(grossCents, 0), terms.thresholdCents);
  const aboveBand = Math.max(0, grossCents - terms.thresholdCents);
  const topFee = Math.round(inTopBand * terms.topRate);
  const aboveFee = Math.round(aboveBand * terms.aboveRate);
  return { topFee, aboveFee, total: topFee + aboveFee };
}
