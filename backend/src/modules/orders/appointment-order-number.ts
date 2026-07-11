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

/**
 * Map appointment ids → { orderId, orderNumber } for building order links.
 * Resolves via BOTH linkage paths — the legacy `Order.appointmentIds` array and
 * the `OrderAppointment` join relation — so calendar events can deep-link to the
 * order regardless of how the appointment was minted. Best-effort.
 */
export async function mapAppointmentOrders(
  appointmentIds: string[],
): Promise<Map<string, { orderId: string; orderNumber: string | null }>> {
  const map = new Map<string, { orderId: string; orderNumber: string | null }>();
  if (appointmentIds.length === 0) return map;

  const wanted = new Set(appointmentIds);
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { appointmentIds: { hasSome: appointmentIds } },
        { orderAppointments: { some: { appointmentId: { in: appointmentIds } } } },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      appointmentIds: true,
      orderAppointments: { select: { appointmentId: true } },
    },
  });

  for (const order of orders) {
    const linked = [
      ...order.appointmentIds,
      ...order.orderAppointments.map((oa) => oa.appointmentId),
    ];
    for (const appointmentId of linked) {
      if (wanted.has(appointmentId) && !map.has(appointmentId)) {
        map.set(appointmentId, { orderId: order.id, orderNumber: order.orderNumber });
      }
    }
  }
  return map;
}
