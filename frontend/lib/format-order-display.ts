/** Prefer stored ORD-000001 style number; fall back to legacy CUID suffix. */
export function formatOrderDisplayId(order: {
  id: string;
  orderNumber?: string | null;
}): string {
  if (order.orderNumber?.trim()) return order.orderNumber.trim();
  return order.id.slice(-8).toUpperCase();
}
