import type { PillTone } from "@/components/portal-atoms";

/** Order status → Pill tone. Shared by account/orders/page.tsx and
 *  account/orders/[id]/page.tsx (was duplicated verbatim in both). */
export function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}
