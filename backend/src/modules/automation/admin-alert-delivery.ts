import { env } from "../../config/env.js";
import {
  sendWhatsAppText,
  sendWhatsAppGroupText,
  formatWhatsAppSendError,
} from "../../lib/whatsapp/wasender.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import { sendAutomationEmail } from "./send-automation-notification.js";

/**
 * The staff-alert fan-out: admin WhatsApp numbers → admin WhatsApp group →
 * admin emails → in-portal bell, each leg logged as its own AutomationRun.
 *
 * Extracted from `admin-booking-alert.service.ts` so the health-test kit alert
 * can reuse it verbatim. The booking alert and the kit alert differ only in
 * what the message SAYS (a slot + doctor vs. a shipping address) — the delivery
 * rules, the per-leg logging and the never-throw contract are the same, and a
 * second copy of them is the kind of drift that ends with one channel silently
 * dead for one alert type.
 *
 * Recipients come from ADMIN_NOTIFY_WHATSAPP_NUMBERS / ADMIN_NOTIFY_EMAILS /
 * ADMIN_NOTIFY_WHATSAPP_GROUP_JID (comma-separated for the first two). Every
 * leg is best-effort: an unset var or a failed send is recorded and never
 * throws into the caller's flow.
 */

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

/** The WhatsApp group staff alerts are mirrored into, when configured. */
export function adminNotifyGroupJid(): string | undefined {
  return env.ADMIN_NOTIFY_WHATSAPP_GROUP_JID?.trim() || undefined;
}

/** HTML-escape a value going into an admin email body. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type AdminAlertDelivery = {
  orderId: string;
  /** AutomationRun key prefix — each leg appends `_admin_<channel>`. */
  automationKeyPrefix: string;
  /** Short human label for the AutomationRun rows. */
  summary: string;
  /** Plain text — the WhatsApp body and the email text part. */
  text: string;
  emailSubject: string;
  emailHtml: string;
  /** Mirror into ADMIN_NOTIFY_WHATSAPP_GROUP_JID as well. */
  toGroup: boolean;
  /** Notification type for the in-portal admin bell. */
  portalType: "APPOINTMENT_ASSIGNED" | "HEALTH_TEST_BOOKED";
  /** Label the email send is recorded under (order number, not the cuid). */
  emailRecordLabel: string;
};

/**
 * Fire an admin alert on every configured channel. Never throws.
 */
export async function deliverAdminAlert(delivery: AdminAlertDelivery): Promise<void> {
  const { orderId, automationKeyPrefix, summary, text } = delivery;

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
      // decides what the caller put in the body.
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

  if (delivery.toGroup) {
    const groupJid = adminNotifyGroupJid();
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

  for (const to of adminNotifyEmails()) {
    const run = await createAutomationRun({
      automationKey: `${automationKeyPrefix}_admin_email`,
      orderId,
      channel: "email",
      recipient: to,
      summary,
      status: "RUNNING",
    }).catch(() => null);
    try {
      await sendAutomationEmail(
        { to, subject: delivery.emailSubject, text, html: delivery.emailHtml },
        { recordLabel: delivery.emailRecordLabel },
      );
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
    await notifyAdmins(delivery.portalType, {
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
