import { z } from "zod";

/**
 * `PUT /api/me/cart/benefit` (§4.1) — the cart-level benefit choice.
 *
 * `UNSET` is deliberately not accepted: it is the initial state, meaning "the
 * benefit step has not run", and letting a client set it back would re-open
 * §6.4's reject path on a cart that had already been decided.
 *
 * `refId` is the enrollment id for MEMBERSHIP and `credit` / `discount` for
 * PUBLIC_PLAN. CORPORATE needs none (there is at most one membership), and for
 * INSURANCE it is display state only — the per-line `insuranceCompanyId` is
 * what the insurance lifecycle actually reads (§33).
 */
export const setCartBenefitSchema = z.object({
  source: z.enum(["NONE", "MEMBERSHIP", "CORPORATE", "PUBLIC_PLAN", "INSURANCE"]),
  refId: z.string().trim().min(1).max(80).optional(),
});

export type SetCartBenefitBody = z.infer<typeof setCartBenefitSchema>;
