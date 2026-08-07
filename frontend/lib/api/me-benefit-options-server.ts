import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Server-side read of `GET /api/me/benefit-options` (§6.3), for the booking
 * wizard's benefit step.
 *
 * Server-rendered rather than client-fetched because the step is part of a
 * link-driven wizard: every other step renders its choices as `<a>` elements
 * the server already knows, and a client fetch here would put a spinner in the
 * middle of a flow that has none.
 *
 * Returns null for guests (the endpoint 401s) and on any failure, so the step
 * degrades to "log in to use a membership, plan or corporate benefit" instead
 * of throwing mid-booking.
 */

export type BenefitOptionSource = "MEMBERSHIP" | "CORPORATE" | "PUBLIC_PLAN" | "INSURANCE";

export type BenefitOptionNote =
  | { key: "ALLOWANCE_UNIT"; remaining: number }
  | { key: "PLAN_CREDIT"; remaining: number }
  | { key: "ALLOWANCE_EXHAUSTED" }
  | { key: "INSURANCE_DEFERRED" };

export type BenefitOption = {
  source: BenefitOptionSource;
  refId: string;
  label: string;
  unitPriceCents: number;
  discountCents: number;
  note: BenefitOptionNote | null;
  indicative: boolean;
  recommended: boolean;
};

export type BenefitOptionsResult = {
  fullPriceCents: number;
  currencyCode: string;
  slotPriced: boolean;
  options: BenefitOption[];
};

export async function getServerBenefitOptions(args: {
  serviceId: string;
  locale?: string | null;
}): Promise<BenefitOptionsResult | null> {
  try {
    const cookieHeader = (await cookies())
      .getAll()
      .map((entry) => `${entry.name}=${entry.value}`)
      .join("; ");
    if (!cookieHeader) return null;

    const backend = getBackendOrigin();
    if (!backend) return null;

    const params = new URLSearchParams({ serviceId: args.serviceId });
    if (args.locale) params.set("locale", args.locale.toUpperCase());

    const response = await fetch(`${backend}/api/me/benefit-options?${params.toString()}`, {
      method: "GET",
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { ok?: boolean; data?: BenefitOptionsResult };
    if (!json.ok) return null;
    return json.data ?? null;
  } catch {
    return null;
  }
}
