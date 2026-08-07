import { env } from "../../config/env.js";
import {
  sendWhatsAppText,
  sendWhatsAppGroupText,
  formatWhatsAppSendError,
} from "../../lib/whatsapp/wasender.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import { sendAutomationEmail } from "./send-automation-notification.js";

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
 * Recipients come from ADMIN_NOTIFY_WHATSAPP_NUMBERS / ADMIN_NOTIFY_EMAILS
 * (comma-separated). Both legs are best-effort: an unset var or a failed send is
 * recorded as an AutomationRun row and never throws into the booking flow.
 */

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

/** Extra WhatsApp group that mirrors the booking-confirmed alert only. */
function bookingConfirmedGroupJid(): string | undefined {
  return env.ADMIN_NOTIFY_WHATSAPP_GROUP_JID?.trim() || undefined;
}

function parseRecipients(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function adminNotifyWhatsAppNumbers(): string[] {
  return parseRecipients(env.ADMIN_NOTIFY_WHATSAPP_NUMBERS);
}

export function adminNotifyEmails(): string[] {
  return parseRecipients(env.ADMIN_NOTIFY_EMAILS);
}

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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
        <td style="padding:8px 2px;color:#6D6D6D;width:40%;">${esc(label)}</td>
        <td style="padding:8px 2px;font-weight:600;color:#1D4B36;">${esc(value)}</td>
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
  const summary = `Admin alert — ${event.replace(/_/g, " ")}`;
  const text = buildAdminBookingAlertText(ctx, event);

  const numbers = adminNotifyWhatsAppNumbers();
  if (numbers.length === 0) {
    await createAutomationRun({
      automationKey: `${automationKeyPrefix}_admin_whatsapp`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${summary} (set ADMIN_NOTIFY_WHATSAPP_NUMBERS to enable)`,
      executedAt: new Date(),
    }).catch(() => undefined);
  }
  for (const to of numbers) {
    const run = await createAutomationRun({
      automationKey: `${automationKeyPrefix}_admin_whatsapp`,
      orderId,
      channel: "whatsapp",
      recipient: to,
      summary,
      status: "RUNNING",
    }).catch(() => null);
    try {
      // Staff number → no patientConsent gate. The patient's own consent only
      // decides whether their NAME appears in the body (see alertLines).
      const result = await sendWhatsAppText({ to, message: text });
      if (!run) continue;
      if (!result.ok && !result.skipped) {
        await finishAutomationRun(run.id, {
          status: "FAILED",
          summary,
          error: formatWhatsAppSendError(result),
          recipient: result.to ?? to,
        });
        continue;
      }
      await finishAutomationRun(run.id, {
        status: result.skipped ? "SKIPPED" : "SUCCESS",
        summary: result.skipped ? `${summary} (WhatsApp not configured)` : summary,
        recipient: result.to ?? to,
      });
    } catch (err) {
      if (!run) continue;
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }
  }

  if (event === "payment_confirmed") {
    const groupJid = bookingConfirmedGroupJid();
    if (groupJid) {
      const run = await createAutomationRun({
        automationKey: `${automationKeyPrefix}_admin_whatsapp_group`,
        orderId,
        channel: "whatsapp",
        recipient: groupJid,
        summary,
        status: "RUNNING",
      }).catch(() => null);
      try {
        const result = await sendWhatsAppGroupText({ to: groupJid, message: text });
        if (run) {
          if (!result.ok && !result.skipped) {
            await finishAutomationRun(run.id, {
              status: "FAILED",
              summary,
              error: formatWhatsAppSendError(result),
              recipient: groupJid,
            });
          } else {
            await finishAutomationRun(run.id, {
              status: result.skipped ? "SKIPPED" : "SUCCESS",
              summary: result.skipped ? `${summary} (WhatsApp not configured)` : summary,
              recipient: groupJid,
            });
          }
        }
      } catch (err) {
        if (run) {
          await finishAutomationRun(run.id, {
            status: "FAILED",
            summary,
            error: err instanceof Error ? err.message : String(err),
          }).catch(() => undefined);
        }
      }
    }
  }

  const emails = adminNotifyEmails();
  const subject = `${HEADLINE[event]} — order #${ctx.orderNumber}`;
  const html = buildAdminBookingAlertHtml(ctx, event);
  for (const to of emails) {
    const run = await createAutomationRun({
      automationKey: `${automationKeyPrefix}_admin_email`,
      orderId,
      channel: "email",
      recipient: to,
      summary,
      status: "RUNNING",
    }).catch(() => null);
    try {
      await sendAutomationEmail({ to, subject, text, html }, { recordLabel: ctx.orderNumber });
      if (run) await finishAutomationRun(run.id, { status: "SUCCESS", summary });
    } catch (err) {
      if (!run) continue;
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }
  }

  // In-portal bell — always fires, needs no env configuration.
  try {
    const { notifyAdmins } = await import("../notifications/notify.service.js");
    await notifyAdmins("APPOINTMENT_ASSIGNED", {
      snippet: text.replace(/\n/g, " · "),
    });
    await createAutomationRun({
      automationKey: `${automationKeyPrefix}_admin_portal`,
      orderId,
      channel: "portal",
      status: "SUCCESS",
      summary,
      executedAt: new Date(),
    });
  } catch {
    // best-effort
  }
}
