import { env } from "../../config/env.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import { resolveDoctorContact } from "../../lib/whatsapp/resolve-doctor-contact.js";
import type { PhoneNormalizeHints } from "../../lib/whatsapp/normalize-phone.js";
import { orderPayShortLink } from "../orders/order-payment-url.service.js";
import { sendAutomationEmail } from "../automation/send-automation-notification.js";
import {
  createAutomationRun,
  finishAutomationRun,
} from "../automation/automation-run.service.js";
import {
  adminNotifyWhatsAppNumbers,
  adminNotifyEmails,
} from "../automation/admin-booking-alert.service.js";

/**
 * Cross-border prescription notifications — patient, prescribing doctor (B),
 * and admin, on both WhatsApp and email, using the shared branded email
 * template (`wrapHtml`) and the short pay link (`orderPayShortLink`) exactly
 * like the pre-payment drip. Every leg is best-effort and logged as an
 * AutomationRun so gaps surface in the portal; nothing here ever throws into
 * the request/payment flow.
 */

const PORTAL = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
const INBOX_URL = `${PORTAL}/doctor/cross-border-rx`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ctaButton(url: string, label: string): string {
  return `<p style="margin:20px 0;">
    <a href="${esc(url)}" style="display:inline-block;padding:12px 22px;background:#1D4B36;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;">${esc(label)}</a>
  </p>
  <p style="font-size:13px;color:#6D6D6D;">Or open this link:<br>${esc(url)}</p>`;
}

// ── Tracked send helpers (mirror the pre-payment / admin-alert pattern) ───────

async function trackedWhatsApp(opts: {
  automationKey: string;
  orderId: string;
  to: string | null | undefined;
  message: string;
  summary: string;
  hints?: PhoneNormalizeHints;
  /** Patient sends: pass the booking's consent. Staff sends omit it. */
  patientConsent?: boolean;
}): Promise<void> {
  if (opts.patientConsent === false) {
    await createAutomationRun({
      automationKey: opts.automationKey,
      orderId: opts.orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${opts.summary} (no WhatsApp consent)`,
      executedAt: new Date(),
    }).catch(() => undefined);
    return;
  }
  if (!opts.to?.trim()) {
    await createAutomationRun({
      automationKey: opts.automationKey,
      orderId: opts.orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${opts.summary} (no phone)`,
      executedAt: new Date(),
    }).catch(() => undefined);
    return;
  }
  const run = await createAutomationRun({
    automationKey: opts.automationKey,
    orderId: opts.orderId,
    channel: "whatsapp",
    recipient: opts.to,
    summary: opts.summary,
    status: "RUNNING",
  }).catch(() => null);
  try {
    const result = await sendWhatsAppText({
      to: opts.to,
      message: opts.message,
      hints: opts.hints,
      patientConsent: opts.patientConsent,
    });
    if (!run) return;
    if (!result.ok && !result.skipped) {
      const jidMissing = result.message?.toLowerCase().includes("jid does not exist");
      await finishAutomationRun(run.id, {
        status: jidMissing ? "SKIPPED" : "FAILED",
        summary: jidMissing
          ? `${opts.summary} (number not registered on WhatsApp)`
          : opts.summary,
        error: formatWhatsAppSendError(result),
        recipient: result.to ?? opts.to,
      });
      return;
    }
    await finishAutomationRun(run.id, {
      status: result.skipped ? "SKIPPED" : "SUCCESS",
      summary: result.skipped ? `${opts.summary} (WhatsApp not configured)` : opts.summary,
      recipient: result.to ?? opts.to,
    });
  } catch (err) {
    if (run) {
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary: opts.summary,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }
  }
}

async function trackedEmail(opts: {
  automationKey: string;
  orderId: string;
  to: string | null | undefined;
  subject: string;
  text: string;
  html: string;
  summary: string;
  recordLabel?: string;
}): Promise<void> {
  if (!opts.to?.trim()) return;
  const run = await createAutomationRun({
    automationKey: opts.automationKey,
    orderId: opts.orderId,
    channel: "email",
    recipient: opts.to,
    summary: opts.summary,
    status: "RUNNING",
  }).catch(() => null);
  try {
    await sendAutomationEmail(
      { to: opts.to, subject: opts.subject, text: opts.text, html: opts.html },
      { recordLabel: opts.recordLabel },
    );
    if (run) await finishAutomationRun(run.id, { status: "SUCCESS", summary: opts.summary });
  } catch (err) {
    if (run) {
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary: opts.summary,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }
  }
}

// ── 1) Patient: pay the async fee (on request creation) ───────────────────────

export async function notifyPatientCrossBorderPayment(opts: {
  orderId: string;
  orderNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  countryCode: string;
  /** Source appointment's WhatsApp consent — gates the patient WhatsApp send. */
  whatsappConsent: boolean;
}): Promise<void> {
  const shortLink = orderPayShortLink(opts.orderId);

  const emailHtml = wrapHtml(
    "Complete your prescription request",
    `<p>Dear ${esc(opts.fullName)},</p>
     <p>Your doctor has started a cross-border prescription request on your behalf.
     To send it to the prescribing doctor, please complete the payment below.</p>
     ${ctaButton(shortLink, "Pay &amp; submit request")}
     <p>Once paid, the prescribing doctor reviews your request and either issues
     the prescription, asks for more information, or recommends a full consultation.</p>`,
  );
  const emailText = `Dear ${opts.fullName},\n\nYour doctor has started a cross-border prescription request on your behalf. To send it to the prescribing doctor, complete the payment here:\n\n${shortLink}\n\nOnce paid, the prescribing doctor will review your request.`;

  await trackedEmail({
    automationKey: "cross_border_rx_patient_email",
    orderId: opts.orderId,
    to: opts.email,
    subject: "Complete your prescription request",
    text: emailText,
    html: emailHtml,
    summary: "Patient email — cross-border prescription payment link",
    recordLabel: opts.orderNumber,
  });

  await trackedWhatsApp({
    automationKey: "cross_border_rx_patient_whatsapp",
    orderId: opts.orderId,
    to: opts.phone,
    message: `Hi ${opts.fullName}, your doctor started a cross-border prescription request for you. Pay the fee to send it to the prescribing doctor:\n${shortLink}`,
    summary: "Patient WhatsApp — cross-border prescription payment link",
    hints: { orderCountryCode: opts.countryCode },
    patientConsent: opts.whatsappConsent,
  });
}

// ── 2) Prescriber (Doctor B) + admin: a paid request is waiting ───────────────

export async function notifyStaffCrossBorderRequest(opts: {
  orderId: string;
  orderNumber: string;
  targetDoctorId: string;
}): Promise<void> {
  // Prescribing doctor B — WhatsApp + email. Patient identity stays in the
  // portal (the doctor opens the request there), so the messages carry only
  // the operational "you have a request" prompt.
  const contact = await resolveDoctorContact(opts.targetDoctorId);
  if (contact) {
    const doctorMsg = `New cross-border prescription request to review. Open your inbox:\n${INBOX_URL}`;
    await trackedWhatsApp({
      automationKey: "cross_border_rx_doctor_whatsapp",
      orderId: opts.orderId,
      to: contact.whatsappNumber,
      message: doctorMsg,
      summary: "Doctor WhatsApp — new cross-border request",
      hints: contact.whatsappHints,
    });
    await trackedEmail({
      automationKey: "cross_border_rx_doctor_email",
      orderId: opts.orderId,
      to: contact.loginEmail,
      subject: "New cross-border prescription request",
      text: `You have a new cross-border prescription request to review.\n\nOpen your inbox: ${INBOX_URL}`,
      html: wrapHtml(
        "New cross-border prescription request",
        `<p>You have a new cross-border prescription request to review.</p>
         ${ctaButton(INBOX_URL, "Review the request")}`,
      ),
      summary: "Doctor email — new cross-border request",
      recordLabel: opts.orderNumber,
    });
  }

  // Admin team — WhatsApp + email (operational, no patient identity).
  const adminText = `🆕 New cross-border prescription request — order #${opts.orderNumber}. A prescribing doctor has been notified. Review in the doctor portal:\n${INBOX_URL}`;
  const adminHtml = wrapHtml(
    "New cross-border prescription request",
    `<p>A new cross-border prescription request has been paid and routed to a prescribing doctor.</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
       <tr><td style="padding:8px 2px;color:#6D6D6D;width:40%;">Order</td>
           <td style="padding:8px 2px;font-weight:600;color:#1D4B36;">#${esc(opts.orderNumber)}</td></tr>
     </table>
     ${ctaButton(INBOX_URL, "Open the doctor portal")}`,
  );

  const numbers = adminNotifyWhatsAppNumbers();
  for (const to of numbers) {
    await trackedWhatsApp({
      automationKey: "cross_border_rx_admin_whatsapp",
      orderId: opts.orderId,
      to,
      message: adminText,
      summary: "Admin WhatsApp — new cross-border request",
    });
  }
  const emails = adminNotifyEmails();
  for (const to of emails) {
    await trackedEmail({
      automationKey: "cross_border_rx_admin_email",
      orderId: opts.orderId,
      to,
      subject: `🆕 New cross-border prescription request — order #${opts.orderNumber}`,
      text: adminText,
      html: adminHtml,
      summary: "Admin email — new cross-border request",
      recordLabel: opts.orderNumber,
    });
  }
}
