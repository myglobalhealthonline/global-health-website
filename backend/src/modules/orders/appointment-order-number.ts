import { prisma } from "../../db/prisma.js";

/**
 * Map appointment ids → their human-facing order number (e.g. ORD-000001).
 *
 * Appointments don't store the order number directly — an Order records the
 * appointments it minted in `Order.appointmentIds` (a String[]). We reverse
 * that array so message inboxes and the patient bookings/messages lists can
 * label a conversation by its order reference, not just the patient name.
 *
 * Best-effort: appointments with no matching order simply won't appear in the
 * returned map (caller falls back to null).
 */
export async function mapAppointmentOrderNumbers(
  appointmentIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (appointmentIds.length === 0) return map;

  const orders = await prisma.order.findMany({
    where: {
      appointmentIds: { hasSome: appointmentIds },
      orderNumber: { not: null },
    },
    select: { orderNumber: true, appointmentIds: true },
  });

  const wanted = new Set(appointmentIds);
  for (const order of orders) {
    if (!order.orderNumber) continue;
    for (const appointmentId of order.appointmentIds) {
      if (wanted.has(appointmentId) && !map.has(appointmentId)) {
        map.set(appointmentId, order.orderNumber);
      }
    }
  }
  return map;
}
