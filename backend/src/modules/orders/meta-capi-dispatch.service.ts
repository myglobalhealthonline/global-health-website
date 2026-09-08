import { prisma } from "../../db/prisma.js";
import { isMetaCapiConfigured, sendMetaPurchaseEvent } from "../../lib/meta/capi-client.js";

/**
 * Gates the Meta Conversions API send for a paid order. Kept separate from
 * `dispatchMetaCapiPurchaseForOrder` (below) so the decision itself is
 * unit-testable without a database.
 *
 * All three checks matter:
 *  - `marketingConsent !== true` — the visitor declined ad tracking, or the
 *    order predates this feature (no `adAttribution` at all). CAPI must
 *    never fire without it (strict consent mode, same rule as the browser
 *    pixel).
 *  - `totalCents <= 0` — a fully credit/plan-covered order is not ad-driven
 *    revenue; sending it as a Purchase would inflate ROAS with €0 orders.
 */
export type OrderAdAttribution = {
  marketingConsent?: boolean;
  fbp?: string;
  fbc?: string;
  clientIp?: string | null;
  clientUserAgent?: string | null;
};

export function shouldSendMetaCapiPurchase(order: {
  totalCents: number;
  adAttribution: OrderAdAttribution | null;
}): boolean {
  if (order.totalCents <= 0) return false;
  return order.adAttribution?.marketingConsent === true;
}

/** Outbox dispatcher entry point for `OUTBOX_KIND_META_CAPI_PURCHASE`. */
export async function dispatchMetaCapiPurchaseForOrder(orderId: string): Promise<void> {
  if (!isMetaCapiConfigured()) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      email: true,
      phone: true,
      currencyCode: true,
      totalCents: true,
      paidAt: true,
      adAttribution: true,
    },
  });
  if (!order) return;

  const adAttribution = order.adAttribution as OrderAdAttribution | null;
  if (!shouldSendMetaCapiPurchase({ totalCents: order.totalCents, adAttribution })) return;

  await sendMetaPurchaseEvent({
    orderId,
    eventTime: Math.floor((order.paidAt ?? new Date()).getTime() / 1000),
    valueMajorUnits: order.totalCents / 100,
    currency: order.currencyCode,
    email: order.email,
    phone: order.phone,
    clientIp: adAttribution?.clientIp ?? null,
    clientUserAgent: adAttribution?.clientUserAgent ?? null,
    fbp: adAttribution?.fbp ?? null,
    fbc: adAttribution?.fbc ?? null,
  });
}
