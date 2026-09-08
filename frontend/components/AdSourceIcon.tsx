import { IconMeta } from "@/components/ui/BrandIcons";

/** Derived server-side from `Order.adAttribution` — see
 *  `backend/src/modules/orders/order-ad-source.ts`. */
export type AdSource = "META" | null | undefined;

/**
 * Marks an order that came from a paid Meta ad (Facebook or Instagram).
 * Sits beside `BookingSourceIcon`, which answers a different question:
 * `BookingSourceIcon` says HOW the order was placed (website / admin / AI
 * call), this says WHERE the customer came from. Renders nothing for organic,
 * direct and non-Meta traffic — the absence of the glyph is the "not from an
 * ad" state, so no icon competes for attention on the common case.
 */
export function AdSourceIcon({ source }: { source: AdSource }) {
  if (source !== "META") return null;
  const label = "Came from a Meta ad (Facebook/Instagram)";
  return (
    <span
      className="gh-ad-source-icon inline-flex items-center justify-center"
      title={label}
      aria-label={label}
    >
      <IconMeta className="size-3.5" />
    </span>
  );
}
