/** Static catalog of automations shown in the admin Automation tab. */
export type AutomationDefinition = {
  key: string;
  name: string;
  flow: string;
  description: string;
  channels: string[];
  maxStages: number;
};

export const AUTOMATION_CATALOG: AutomationDefinition[] = [
  {
    key: "pre_payment_flow_a",
    name: "Pre-payment — consultation within 48h",
    flow: "Order reserved (not paid)",
    description:
      "Consultation booked within 48 hours of checkout. Doctor notified on booking. Immediate patient WhatsApp + email, then unpaid reminders at 24h, 12h, 6h, and 2h before the consultation. Payment deadline is 1 hour before the consultation; unpaid orders are cancelled then.",
    channels: ["whatsapp", "email"],
    maxStages: 6,
  },
  {
    key: "pre_payment_flow_b",
    name: "Pre-payment — consultation more than 48h away",
    flow: "Order reserved (not paid)",
    description:
      "Consultation booked more than 48 hours out. Doctor notified on booking. Reminders at 72h, 48h, 24h, 12h, and 6h before consultation. Payment deadline is 24 hours before the consultation; unpaid orders are cancelled then.",
    channels: ["whatsapp", "email"],
    maxStages: 7,
  },
  {
    key: "post_payment_flow",
    name: "Post-payment — confirmed consultation",
    flow: "Order paid",
    description:
      "On booking (unpaid): doctor WhatsApp, email, and portal alert. After payment: one patient confirmation with meeting link, doctor confirmation, 1-hour reminder, and 5-minute reminder (WhatsApp + email). Language follows the service name prefix (IE, PT, RO, CZ, SP).",
    channels: ["whatsapp", "email", "portal"],
    maxStages: 4,
  },
  {
    key: "appointment_update",
    name: "Appointment update (admin)",
    flow: "Consultation order",
    description:
      "When an admin changes the consultation date/time or doctor from the order page, patient and doctor(s) receive branded email and WhatsApp with the reason, updated slot, and a fresh Meet link when applicable.",
    channels: ["whatsapp", "email", "portal"],
    maxStages: 1,
  },
  {
    key: "appointment_reminder_24h",
    name: "Appointment reminder (24h before)",
    flow: "Confirmed appointment",
    description: "Email to patient ~24 hours before scheduled consultation.",
    channels: ["email"],
    maxStages: 1,
  },
  {
    key: "abandoned_cart",
    name: "Abandoned cart",
    flow: "Cart recovery",
    description: "Email when a logged-in patient leaves items in cart for 1 hour.",
    channels: ["email"],
    maxStages: 1,
  },
  {
    key: "review_invite",
    name: "Post-consultation review invite",
    flow: "After completed consultation",
    description: "Email and optional WhatsApp with review link.",
    channels: ["email", "whatsapp"],
    maxStages: 1,
  },
  {
    key: "order_refund",
    name: "Order refund",
    flow: "Order refunded",
    description:
      "When an order is refunded (admin action or Stripe charge.refunded), the patient gets a credit note by email (non-Portugal) or a refund confirmation email (Portugal), plus a refund WhatsApp when consent was given. Fires once per order (idempotent across the admin endpoint and the webhook).",
    channels: ["email", "whatsapp"],
    maxStages: 1,
  },
];

export function catalogEntryForKey(key: string): AutomationDefinition | undefined {
  return AUTOMATION_CATALOG.find((a) => a.key === key || key.startsWith(`${a.key}_`));
}

export type OrderDisplayRef = string | { id: string; orderNumber?: string | null };

export function formatOrderDisplayId(order: OrderDisplayRef): string {
  if (typeof order === "object" && order.orderNumber?.trim()) {
    return order.orderNumber.trim();
  }
  const id = typeof order === "string" ? order : order.id;
  return id.slice(-8).toUpperCase();
}
