import { formatPrice } from "@/lib/format-currency";
import { interpolate } from "@/lib/subscription/format";
import type { MemberBenefitView } from "@/lib/api/me-memberships";

type Copy = Record<string, string>;

/**
 * Turn a benefit row into the plain-language line §10 asks for ("20% off
 * specialist consultations"). Pure, so it is the same string on the list page,
 * the detail page and the card.
 *
 * Lives apart from the components because the benefit row is the one piece of
 * this feature a member is most likely to misread — "4 included consultations"
 * and "4 left" are different claims, and only the second is true once some
 * have been used.
 */
export function benefitTarget(benefit: MemberBenefitView, t: Copy): string {
  if (benefit.serviceName) return benefit.serviceName;
  if (benefit.serviceKind === "GENERAL") return t.targetGeneral;
  if (benefit.serviceKind === "SPECIALIST") return t.targetSpecialist;
  return benefit.serviceKind ?? "";
}

/** The headline effect: what the member pays, or how many are left. */
export function benefitValue(benefit: MemberBenefitView, t: Copy): string {
  switch (benefit.benefitType) {
    case "ALLOWANCE": {
      const allowance = benefit.allowance;
      if (!allowance) return "";
      return allowance.remaining > 0
        ? interpolate(t.benefitAllowance, {
            remaining: allowance.remaining,
            allocated: allowance.allocated,
          })
        : t.benefitAllowanceSpent;
    }
    case "PERCENT":
      return interpolate(t.benefitPercent, { percent: benefit.percentOff ?? 0 });
    case "FIXED":
      return interpolate(t.benefitFixed, {
        price: formatPrice(benefit.fixedPriceCents ?? 0, benefit.currencyCode ?? "EUR"),
      });
    case "EXCLUDED":
    default:
      return t.benefitExcluded;
  }
}

/**
 * What happens after an allowance runs out (§24). Returned separately rather
 * than folded into the value string so the UI can de-emphasise it — it is a
 * secondary rule, and reading it as the primary one would understate the
 * benefit while units remain.
 */
export function benefitFallback(benefit: MemberBenefitView, t: Copy): string | null {
  if (benefit.benefitType !== "ALLOWANCE" || benefit.fallbackType === "NONE") return null;
  const detail =
    benefit.fallbackType === "PERCENT"
      ? interpolate(t.benefitPercent, { percent: benefit.fallbackPercent ?? 0 })
      : interpolate(t.benefitFixed, {
          price: formatPrice(benefit.fallbackFixedCents ?? 0, benefit.currencyCode ?? "EUR"),
        });
  return interpolate(t.benefitFallback, { detail });
}
