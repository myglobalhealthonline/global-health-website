import { prisma } from "../../db/prisma.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { formatWhatsAppSendError, sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { escapeHtml } from "./admin-alert-delivery.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import {
  hasTrackingDetails,
  patientEmailSubjectHealthTestTracking,
  patientWhatsAppHealthTestTracking,
  type HealthTestTrackingContext,
} from "./health-test-messages.js";
import { resolveNotificationLang } from "./notification-language.js";
import { sendAutomationEmail } from "./send-automation-notification.js";

/**
 * Hand the customer their kit's dispatch details, on an admin's say-so.
 *
 * The kit itself is posted by hand and booked into the courier's own system
 * outside this app, so the tracking code only ever enters ours by an admin
 * typing it in. Saving it and sending it are deliberately two acts — an admin
 * pastes a code, eyeballs it, and only then presses "Save & notify" — so this
 * is never triggered by a write to `Order.tracking*`.
 *
 * Re-sendable on purpose: couriers reissue codes, and a WhatsApp send can fail
 * for reasons that are fixed later (a corrected phone number). Each attempt is
 * its own AutomationRun; `Order.trackingNotifiedAt` carries the last success.
 *
 * WhatsApp is gated on `Order.whatsappConsent` (the checkout opt-out). Email is
 * not: it is transactional order correspondence to the address that placed the
 * order, the same footing as the receipt.
 */

export type TrackingNotifyResult = {
  ok: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  /** Why a leg did not go out — shown back to the admin, never to the patient. */
  notes: string[];
};

function trackingHtml(ctx: HealthTestTrackingContext, intro: string): string {
  const rows: string[] = [];
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 2px;color:#6D6D6D;width:40%;">${escapeHtml(label)}</td>
      <td style="padding:8px 2px;font-weight:600;color:#1D4B36;">${value}</td>
    </tr>`;
  rows.push(row("Order", `#${escapeHtml(ctx.orderNumber)}`));
  rows.push(row("Kit(s)", escapeHtml(ctx.kits.join(", "))));
  if (ctx.trackingCarrier?.trim()) rows.push(row("Carrier", escapeHtml(ctx.trackingCarrier.trim())));
  if (ctx.trackingNumber?.trim()) {
    rows.push(row("Tracking number", escapeHtml(ctx.trackingNumber.trim())));
  }
  if (ctx.trackingUrl?.trim()) {
    const url = ctx.trackingUrl.trim();
    // Rendered as a link, so the href is escaped as an attribute value and the
    // visible text is escaped as text — the URL is admin-entered, not ours.
    rows.push(
      row(
        "Track your kit",
        `<a href="${escapeHtml(url)}" style="color:#1D4B36;">${escapeHtml(url)}</a>`,
      ),
    );
  }
  return wrapHtml(
    "Your test kit is on its way",
    `<p style="font-size:14px;color:#1D1D1D;">${escapeHtml(intro)}</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${rows.join("\n      ")}
    </table>`,
  );
}

export async function sendHealthTestTrackingToCustomer(
  orderId: string,
): Promise<TrackingNotifyResult> {
  const notes: string[] = [];
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { healthTest: { select: { title: true } } } } },
  });
  if (!order) return { ok: false, emailSent: false, whatsappSent: false, notes: ["Order not found"] };

  const kitItems = order.items.filter((i) => i.kind === "HEALTH_TEST");
  if (kitItems.length === 0) {
    return {
      ok: false,
      emailSent: false,
      whatsappSent: false,
      notes: ["This order has no health test kit on it"],
    };
  }

  const ctx: HealthTestTrackingContext = {
    patientName: order.fullName,
    orderNumber: order.orderNumber ?? order.id,
    kits: kitItems.map((i) => `${i.quantity}× ${i.healthTest?.title ?? i.name}`),
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
    trackingUrl: order.trackingUrl,
  };
  if (!hasTrackingDetails(ctx)) {
    notes.push("No carrier, tracking number or URL saved — sent as a plain dispatch notice");
  }

  const lang = resolveNotificationLang({
    notificationLocale: order.notificationLocale,
    countryCode: order.countryCode,
  });
  const text = patientWhatsAppHealthTestTracking(ctx, lang);
  const summary = "Patient — health test kit dispatched";

  // ── Email ────────────────────────────────────────────────────────────────
  let emailSent = false;
  const emailRun = await createAutomationRun({
    automationKey: "health_test_tracking_patient_email",
    orderId,
    channel: "email",
    recipient: order.email,
    summary,
    status: "RUNNING",
  }).catch(() => null);
  try {
    await sendAutomationEmail(
      {
        to: order.email,
        subject: patientEmailSubjectHealthTestTracking(ctx, lang),
        text,
        html: trackingHtml(ctx, `Hi ${ctx.patientName}, your test kit is on its way.`),
      },
      { recordLabel: ctx.orderNumber },
    );
    emailSent = true;
    if (emailRun) await finishAutomationRun(emailRun.id, { status: "SUCCESS", summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    notes.push(`Email failed: ${message}`);
    if (emailRun) {
      await finishAutomationRun(emailRun.id, {
        status: "FAILED",
        summary,
        error: message,
      }).catch(() => undefined);
    }
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  let whatsappSent = false;
  if (!order.phone?.trim()) {
    notes.push("No phone on the order — WhatsApp skipped");
    await createAutomationRun({
      automationKey: "health_test_tracking_patient_whatsapp",
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${summary} (no phone on order)`,
      executedAt: new Date(),
    }).catch(() => undefined);
  } else if (!order.whatsappConsent) {
    notes.push("Customer opted out of WhatsApp updates for this order — WhatsApp skipped");
    await createAutomationRun({
      automationKey: "health_test_tracking_patient_whatsapp",
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${summary} (no WhatsApp consent)`,
      executedAt: new Date(),
    }).catch(() => undefined);
  } else {
    const run = await createAutomationRun({
      automationKey: "health_test_tracking_patient_whatsapp",
      orderId,
      channel: "whatsapp",
      recipient: order.phone,
      summary,
      status: "RUNNING",
    }).catch(() => null);
    try {
      const result = await sendWhatsAppText({
        to: order.phone,
        message: text,
        hints: {
          orderCountryCode: order.countryCode,
          patientAddressCountryCode: order.shipCountryCode,
        },
        patientConsent: order.whatsappConsent,
      });
      if (!result.ok && !result.skipped) {
        notes.push(`WhatsApp failed: ${formatWhatsAppSendError(result)}`);
        if (run) {
          await finishAutomationRun(run.id, {
            status: "FAILED",
            summary,
            error: formatWhatsAppSendError(result),
            recipient: result.to ?? order.phone,
          });
        }
      } else if (result.skipped) {
        notes.push(result.message ?? "WhatsApp not configured — skipped");
        if (run) {
          await finishAutomationRun(run.id, {
            status: "SKIPPED",
            summary: `${summary} (${result.message ?? "skipped"})`,
            recipient: result.to ?? order.phone,
          });
        }
      } else {
        whatsappSent = true;
        if (run) {
          await finishAutomationRun(run.id, {
            status: "SUCCESS",
            summary,
            recipient: result.to ?? order.phone,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      notes.push(`WhatsApp failed: ${message}`);
      if (run) {
        await finishAutomationRun(run.id, {
          status: "FAILED",
          summary,
          error: message,
        }).catch(() => undefined);
      }
    }
  }

  // Stamped when at least one channel actually reached the customer. Stamping
  // on a total failure would tell the next admin the patient had been told.
  if (emailSent || whatsappSent) {
    await prisma.order
      .update({ where: { id: orderId }, data: { trackingNotifiedAt: new Date() } })
      .catch(() => undefined);
  }

  return { ok: emailSent || whatsappSent, emailSent, whatsappSent, notes };
}
