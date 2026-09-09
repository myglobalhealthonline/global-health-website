import { wrapHtml } from "../../lib/email/templates.js";
import {
  adminNotifyEmails,
  adminNotifyWhatsAppNumbers,
  deliverAdminAlert,
  escapeHtml,
} from "./admin-alert-delivery.js";

/**
 * Staff-facing booking alerts.
 *
 * The admin team is told about every consultation booking and every payment
 * confirmation, independently of the patient's WhatsApp preference. The alert
 * deliberately carries only operational fields — order number, appointment slot,
 * assigned doctor, consultation name. The PATIENT NAME is included only when the
 * patient consented to WhatsApp updates; without consent it is withheld, so an
 * opt-out never leaks the patient's identity onto a staff phone.
 *
 * Delivery (recipients, per-channel AutomationRun logging, never-throw) lives in
 * `admin-alert-delivery.ts` and is shared with the health-test kit alert.
 */

// Re-exported for the callers that already import them from here.
export { adminNotifyWhatsAppNumbers, adminNotifyEmails };

export type AdminBookingAlertContext = {
  orderNumber: string;
  /** Already-formatted, timezone-aware slot label. */
  appointmentDateTime: string;
  doctorName: string;
  serviceName: string;
  /** Full patient name — emitted ONLY when `patientWhatsappConsent` is true. */
  patientName: string;
  /** Booking's WhatsApp consent. False/null → the patient name is withheld. */
  patientWhatsappConsent: boolean | null;
};

export type AdminBookingAlertEvent =
  | "booking_received"
  | "payment_confirmed"
  | "appointment_updated"
  /** Website checkout left unpaid for 15 minutes — reservation released. */
  | "web_checkout_abandoned";

const HEADLINE: Record<AdminBookingAlertEvent, string> = {
  booking_received: "🆕 New booking (payment pending)",
  payment_confirmed: "✅ Booking confirmed — payment received",
  appointment_updated: "✏️ Appointment updated",
  web_checkout_abandoned: "🚫 Website checkout abandoned — reservation released",
};

const WITHHELD_PATIENT_LABEL = "Withheld (patient declined WhatsApp updates)";

function alertLines(ctx: AdminBookingAlertContext, event: AdminBookingAlertEvent): string[] {
  return [
    HEADLINE[event],
    `Order: #${ctx.orderNumber}`,
    `Date & time: ${ctx.appointmentDateTime}`,
    `Doctor: ${ctx.doctorName}`,
    `Consultation: ${ctx.serviceName}`,
    `Patient: ${ctx.patientWhatsappConsent === true ? ctx.patientName : WITHHELD_PATIENT_LABEL}`,
  ];
}

/** Plain-text body — used for the WhatsApp message and the email text part. */
export function buildAdminBookingAlertText(
  ctx: AdminBookingAlertContext,
  event: AdminBookingAlertEvent,
): string {
  return alertLines(ctx, event).join("\n");
}

function buildAdminBookingAlertHtml(
  ctx: AdminBookingAlertContext,
  event: AdminBookingAlertEvent,
): string {
  const [headline, ...rows] = alertLines(ctx, event);
  const body = rows
    .map((row) => {
      const idx = row.indexOf(":");
      const label = row.slice(0, idx);
      const value = row.slice(idx + 1).trim();
      return `<tr>
        <td style="padding:8px 2px;color:#6D6D6D;width:40%;">${escapeHtml(label)}</td>
        <td style="padding:8px 2px;font-weight:600;color:#1D4B36;">${escapeHtml(value)}</td>
      </tr>`;
    })
    .join("\n      ");
  return wrapHtml(
    headline,
    `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${body}
    </table>`,
  );
}

/**
 * Fire the admin alert on all configured channels. Never throws — every failure
 * lands in the automation log so admins can see the gap in the portal.
 */
export async function sendAdminBookingAlert(
  orderId: string,
  automationKeyPrefix: string,
  event: AdminBookingAlertEvent,
  ctx: AdminBookingAlertContext,
): Promise<void> {
  await deliverAdminAlert({
    orderId,
    automationKeyPrefix,
    summary: `Admin alert — ${event.replace(/_/g, " ")}`,
    text: buildAdminBookingAlertText(ctx, event),
    emailSubject: `${HEADLINE[event]} — order #${ctx.orderNumber}`,
    emailHtml: buildAdminBookingAlertHtml(ctx, event),
    // The group mirrors confirmed bookings only — a pending or abandoned
    // checkout is triage for the admin numbers, not news for the whole team.
    toGroup: event === "payment_confirmed",
    portalType: "APPOINTMENT_ASSIGNED",
    emailRecordLabel: ctx.orderNumber,
  });
}
