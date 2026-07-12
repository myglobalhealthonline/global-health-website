import type { InsuranceCompany, InsuranceServiceCoverage } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

/**
 * Insurance pricing authority.
 *
 * A single place that turns an insurance company + its coverage row for a
 * service into the negotiated price the patient pays. Every surface that can
 * charge an insurance price (public service payload, cart add, checkout
 * anti-tamper recompute) routes through here so the displayed price and the
 * charged price can never diverge — mirrors `peak-pricing.service.ts`.
 *
 * Two pricing modes, fixed at company setup:
 *   - FIXED   → the admin-typed `overridePriceCents` on the coverage row.
 *   - PERCENT → `basePriceCents * (1 - discountPercent/100)`, derived at read
 *               time so it tracks base-price changes automatically.
 */

/** Company pricing knobs the resolver reads (mode + optional percent). */
export type InsuranceCompanyPricing = Pick<
  InsuranceCompany,
  "pricingMode" | "discountPercent"
>;

/** Coverage row pricing knob (the FIXED per-service override). */
export type InsuranceCoveragePricing = Pick<
  InsuranceServiceCoverage,
  "overridePriceCents"
>;

export type ResolveInsurancePriceArgs = {
  /** Flat service price (Service.basePriceCents). */
  basePriceCents: number;
  company: InsuranceCompanyPricing;
  coverage: InsuranceCoveragePricing;
};

/**
 * Decide the insurance price for one covered service. Pure: no I/O, fully
 * unit-testable. Returns null when the price cannot be resolved (FIXED company
 * with no typed override, or PERCENT company with no percent) so callers fall
 * back to the base/peak price rather than charging a bogus amount.
 */
export function resolveInsurancePrice(args: ResolveInsurancePriceArgs): number | null {
  const { basePriceCents, company, coverage } = args;

  if (company.pricingMode === "FIXED") {
    return coverage.overridePriceCents ?? null;
  }

  // PERCENT
  const pct = company.discountPercent;
  if (pct == null || pct < 0 || pct > 100) return null;
  return Math.round(basePriceCents * (1 - pct / 100));
}

/**
 * Load + VALIDATE the insurance price a patient's selected company gives for a
 * service. This is the spoof guard the money path relies on: the price is only
 * returned when a coverage row actually exists AND the company is active AND
 * the company belongs to the same country as the service. Any failure returns
 * null, so a patient can never post an arbitrary company id to get a cheaper
 * price than the admin configured.
 */
export async function loadValidatedInsurancePrice(
  serviceId: string,
  insuranceCompanyId: string,
): Promise<number | null> {
  try {
    const coverage = await prisma.insuranceServiceCoverage.findFirst({
      where: {
        serviceId,
        insuranceCompanyId,
        company: { isActive: true },
      },
      select: {
        overridePriceCents: true,
        company: {
          select: { pricingMode: true, discountPercent: true, countryId: true },
        },
        service: {
          select: { basePriceCents: true, countryId: true },
        },
      },
    });

    if (!coverage) return null;
    // Company + service must live in the same country (defence in depth: the
    // @@unique on coverage already scopes by company, but a service could in
    // theory be re-parented — never price cross-country).
    if (coverage.company.countryId !== coverage.service.countryId) return null;
    if (coverage.service.basePriceCents == null) return null;

    return resolveInsurancePrice({
      basePriceCents: coverage.service.basePriceCents,
      company: coverage.company,
      coverage: { overridePriceCents: coverage.overridePriceCents },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not read insurance pricing");
  }
}
