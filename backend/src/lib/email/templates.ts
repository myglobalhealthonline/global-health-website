import { env } from "../../config/env.js";
import { sendAutomationEmail } from "../../modules/automation/send-automation-notification.js";
import { formatOrderDisplayId } from "../../modules/automation/automation-catalog.js";
import { absoluteSiteUrl, sendEmail } from "./send-email.js";
import { DEFAULT_EMAIL_LOGO_PATH } from "./resolve-email-logo-url.js";
import { createBrazilConsentToken } from "../../modules/brazil-consent/brazil-consent-link.service.js";

/** Shared branded transactional email shell — matches the public site's
 *  "Clinical Editorial" system (docs/design/design-system-gh2-clinical-editorial.md): deep-night forest
 *  gradient header, lime #B0F122 accent, mono eyebrow, hairline rules.
 *  Every transactional email routes through this. Email-safe: tables,
 *  inline styles, flat-color fallbacks behind gradients. */
export function wrapHtml(title: string, bodyHtml: string): string {
  const logoSrc = absoluteSiteUrl(DEFAULT_EMAIL_LOGO_PATH);
  return `<!doctype html><html><body style="margin:0;padding:0;background-color:#F6F8F1;">
<div style="background-color:#F6F8F1;padding:28px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2D3B36;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:100%;background-color:#ffffff;border:1px solid #E4E7DD;border-radius:20px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#15382A;background:linear-gradient(172deg,#1D4B36 0%,#15382A 55%,#0F2E25 100%);padding:34px 40px 30px;text-align:center;">
        <img src="${escapeHtml(logoSrc)}" alt="Global Health" width="160" style="display:block;max-width:160px;height:auto;margin:0 auto;" />
        <div style="margin-top:26px;font-family:'Cascadia Code',Consolas,Menlo,monospace;font-size:11px;letter-spacing:0.14em;color:#B0F122;text-transform:uppercase;">Global Health</div>
        <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:rgba(255,255,255,0.95);letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 40px;line-height:1.65;font-size:15px;color:#2D3B36;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:22px 40px;background-color:#0B241C;font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">
        <span style="color:rgba(255,255,255,0.5);">Medicine anytime, anywhere · </span>
        <a href="https://www.myglobalhealth.online" style="color:#B0F122;text-decoration:none;font-weight:600;">myglobalhealth.online</a>
      </td>
    </tr>
  </table>
</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  fullName: string;
  token: string;
}) {
  const link = absoluteSiteUrl(`/reset-password?token=${encodeURIComponent(opts.token)}`);
  return sendEmail({
    to: opts.to,
    subject: "Reset your Global Health password",
    text: `Hi ${opts.fullName},\n\nWe got a request to reset your password. Open the link below to set a new one. The link expires in 1 hour.\n\n${link}\n\nIf you didn't request this, you can ignore the email.\n\n— Global Health`,
    html: wrapHtml(
      "Reset your password",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>We got a request to reset your password. Click the button to set a new one. The link expires in 1 hour.</p>
       <p style="margin:24px 0;text-align:center;"><a href="${link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Reset password</a></p>
       <p style="font-size:13px;color:#737373;">Or paste this URL into your browser:<br/><a href="${link}">${escapeHtml(link)}</a></p>
       <p>If you didn't request this, you can ignore the email — nothing has changed yet.</p>`,
    ),
  });
}

/**
 * Sent when admin invites a doctor to the portal. Doctor lands on
 * `/reset-password?invite=1&token=…` which swaps the copy to a
 * "welcome — set your password" prompt and auto-signs them in to the
 * doctor portal on success.
 */
export async function sendDoctorInviteEmail(opts: {
  to: string;
  fullName: string;
  token: string;
  doctorTitle?: string;
}) {
  const link = absoluteSiteUrl(
    `/reset-password?token=${encodeURIComponent(opts.token)}&invite=1`,
  );
  const greetingName = opts.doctorTitle
    ? `${opts.doctorTitle} ${opts.fullName}`
    : opts.fullName;
  return sendEmail({
    to: opts.to,
    subject: "You're invited to the Global Health doctor portal",
    text: `Hi ${greetingName},\n\nThe Global Health team has set up a doctor portal account for you. Open the link below to set a password — you'll land straight on your dashboard. The link expires in 7 days.\n\n${link}\n\nIf you didn't expect this invite, you can ignore the email.\n\n— Global Health`,
    html: wrapHtml(
      "Welcome to Global Health",
      `<p>Hi ${escapeHtml(greetingName)},</p>
       <p>The Global Health team has set up a doctor portal account for you. Click the button to set a password — you'll land straight on your dashboard.</p>
       <p style="margin:24px 0;text-align:center;"><a href="${link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Set password &amp; sign in</a></p>
       <p style="font-size:13px;color:#737373;">Or paste this URL into your browser:<br/><a href="${link}">${escapeHtml(link)}</a></p>
       <p>The link expires in 7 days. If you didn't expect this invite, you can ignore the email.</p>`,
    ),
  });
}

export async function sendEmailVerificationEmail(opts: {
  to: string;
  fullName: string;
  token: string;
}) {
  const link = absoluteSiteUrl(`/verify-email?token=${encodeURIComponent(opts.token)}`);
  return sendEmail({
    to: opts.to,
    subject: "Confirm your email — Global Health",
    text: `Hi ${opts.fullName},\n\nThanks for signing up. Confirm your email so we can keep your account secure:\n\n${link}\n\nThe link expires in 24 hours.\n\n— Global Health`,
    html: wrapHtml(
      "Confirm your email",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Thanks for signing up to Global Health. Confirm your email so we can keep your account secure.</p>
       <p style="margin:24px 0;text-align:center;"><a href="${link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Confirm email</a></p>
       <p style="font-size:13px;color:#737373;">Or paste into your browser:<br/><a href="${link}">${escapeHtml(link)}</a></p>
       <p>The link expires in 24 hours.</p>`,
    ),
  });
}

/**
 * Task 4 (phi-access-recovery-plan-2026-07-17): email-OTP second factor —
 * sent instead of blocking a privileged-role login on missing TOTP
 * enrollment. The code is plain text only, never a link — keeps it out of
 * URL/query params entirely (S-006-adjacent: no token-in-URL for this path).
 */
export async function sendLoginOtpEmail(opts: {
  to: string;
  fullName: string;
  code: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.code} is your Global Health sign-in code`,
    text: `Hi ${opts.fullName},\n\nYour sign-in code is: ${opts.code}\n\nEnter it on the sign-in screen to continue. The code expires in 10 minutes and can only be used once.\n\nIf you didn't try to sign in, you can ignore this email.\n\n— Global Health`,
    html: wrapHtml(
      "Your sign-in code",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Enter this code on the sign-in screen to continue:</p>
       <p style="margin:24px 0;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#1B4D3E;text-align:center;">${escapeHtml(opts.code)}</p>
       <p style="font-size:13px;color:#737373;">Expires in 10 minutes. Single use only.</p>
       <p>If you didn't try to sign in, you can ignore this email — nothing has changed.</p>`,
    ),
  });
}

/**
 * S-024: sent to an EXISTING account when someone attempts to register a
 * new account with its email. Registration itself responds identically
 * whether the email is new or already taken (no distinct conflict status),
 * so this is the only signal the real owner gets that someone tried.
 */
export async function sendDuplicateRegistrationNoticeEmail(opts: {
  to: string;
  fullName: string;
}) {
  const loginLink = absoluteSiteUrl("/login");
  const resetLink = absoluteSiteUrl("/forgot-password");
  return sendEmail({
    to: opts.to,
    subject: "Someone tried to sign up with your email — Global Health",
    text: `Hi ${opts.fullName},\n\nSomeone just tried to create a Global Health account using this email address. You already have an account, so nothing changed — no new account was created.\n\nIf this was you, sign in instead: ${loginLink}\nForgot your password? Reset it here: ${resetLink}\n\nIf you don't recognize this, no action is needed — your account is safe.\n\n— Global Health`,
    html: wrapHtml(
      "Someone tried to sign up with your email",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Someone just tried to create a Global Health account using this email address. You already have an account, so nothing changed — no new account was created.</p>
       <p style="margin:24px 0;text-align:center;"><a href="${loginLink}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Sign in</a></p>
       <p style="font-size:13px;color:#737373;">Forgot your password? <a href="${resetLink}">Reset it here</a>.</p>
       <p>If you don't recognize this, no action is needed — your account is safe.</p>`,
    ),
  });
}

/**
 * Sent when admin schedules a call slot for the patient. The Meet link is
 * front-and-center; we also include the slot in the patient's local
 * timezone hint (the date is formatted in UTC + offset, and clients
 * render it in local time).
 */
export async function sendAppointmentScheduledEmail(opts: {
  to: string;
  fullName: string;
  consultationType: string;
  scheduledAt: Date;
  /** Empty / omitted for IN_PERSON visits where the venue replaces the link. */
  meetingUrl?: string | null;
  /** Pre-formatted "Where" line — clinic name + city, or a free-text address. */
  where?: string | null;
  /** Display name of the assigned doctor. Omitted when none is assigned yet. */
  doctorName?: string | null;
}) {
  const formatted = opts.scheduledAt.toUTCString();
  const localHint = opts.scheduledAt.toISOString();
  const meetLink = opts.meetingUrl?.trim() || null;
  const where = opts.where?.trim() || null;
  const doctorName = opts.doctorName?.trim() || null;

  const joinText = meetLink
    ? `Join the call here when it's time:\n${meetLink}\n\n`
    : "";
  const doctorText = doctorName ? `Doctor: ${doctorName}\n\n` : "";
  const whereText = where ? `Where: ${where}\n\n` : "";
  const earlyTipText = meetLink
    ? "open the link 5 minutes early to test your camera and mic."
    : "plan to arrive 5–10 minutes early.";

  const ctaHtml = meetLink
    ? `<p style="margin:24px 0;text-align:center;">
         <a href="${escapeHtml(meetLink)}"
            style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">
           Join the call
         </a>
       </p>
       <p style="font-size:13px;color:#737373;">
         Or paste this link into your browser:<br/>
         <a href="${escapeHtml(meetLink)}">${escapeHtml(meetLink)}</a>
       </p>`
    : "";
  const whereHtml = where
    ? `<p style="margin:16px 0;font-size:14px;color:#1B4D3E;">📍 ${escapeHtml(where)}</p>`
    : "";
  const doctorHtml = doctorName
    ? `<p style="margin:16px 0;font-size:14px;color:#1B4D3E;">👤 Doctor: <strong>${escapeHtml(doctorName)}</strong></p>`
    : "";

  return sendEmail({
    to: opts.to,
    subject: `Your appointment is scheduled — ${opts.consultationType}`,
    text: `Hi ${opts.fullName},

Your ${opts.consultationType} is scheduled for ${formatted}.

${doctorText}${whereText}${joinText}Tip: ${earlyTipText} If you need to reschedule, reply to this email.

— Global Health`,
    html: wrapHtml(
      "Your appointment is scheduled",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Your <strong>${escapeHtml(opts.consultationType)}</strong> is scheduled for:</p>
       <p style="margin:16px 0;font-size:18px;font-weight:700;color:#1B4D3E;">
         <time datetime="${escapeHtml(localHint)}">${escapeHtml(formatted)}</time>
       </p>
       ${doctorHtml}
       ${whereHtml}
       ${ctaHtml}
       <p>Tip: ${earlyTipText} If you need to reschedule, just reply to this email.</p>`,
    ),
  });
}

/**
 * 24h reminder sent by the cron worker. Sibling of the scheduled-email
 * but reframed ("Reminder: your call is tomorrow"). Same Meet link + slot
 * UX so patients only need one mental model.
 */
export async function sendAppointmentReminderEmail(opts: {
  to: string;
  fullName: string;
  consultationType: string;
  scheduledAt: Date;
  /** Empty for IN_PERSON visits — `where` carries the venue instead. */
  meetingUrl?: string | null;
  /** Pre-formatted "Where" line for IN_PERSON visits. */
  where?: string | null;
  /** Display name of the assigned doctor. Omitted when none is assigned yet. */
  doctorName?: string | null;
}) {
  const formatted = opts.scheduledAt.toUTCString();
  const localHint = opts.scheduledAt.toISOString();
  const meetLink = opts.meetingUrl?.trim() || null;
  const where = opts.where?.trim() || null;
  const doctorName = opts.doctorName?.trim() || null;
  const joinText = meetLink
    ? `Join the call:\n${meetLink}\n\n`
    : "";
  const doctorText = doctorName ? `Doctor: ${doctorName}\n\n` : "";
  const whereText = where ? `Where: ${where}\n\n` : "";
  const earlyTipText = meetLink
    ? "Open it 5 minutes early to test camera + mic."
    : "Plan to arrive 5–10 minutes early.";

  const ctaHtml = meetLink
    ? `<p style="margin:24px 0;text-align:center;">
         <a href="${escapeHtml(meetLink)}"
            style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">
           Join the call
         </a>
       </p>
       <p style="font-size:13px;color:#737373;">
         Or paste this link:<br/>
         <a href="${escapeHtml(meetLink)}">${escapeHtml(meetLink)}</a>
       </p>`
    : "";
  const whereHtml = where
    ? `<p style="margin:16px 0;font-size:14px;color:#1B4D3E;">📍 ${escapeHtml(where)}</p>`
    : "";
  const doctorHtml = doctorName
    ? `<p style="margin:16px 0;font-size:14px;color:#1B4D3E;">👤 Doctor: <strong>${escapeHtml(doctorName)}</strong></p>`
    : "";

  return sendAutomationEmail(
    {
      to: opts.to,
      subject: `Reminder: your appointment tomorrow — ${opts.consultationType}`,
      text: `Hi ${opts.fullName},

Quick reminder — your ${opts.consultationType} is tomorrow at ${formatted}.

${doctorText}${whereText}${joinText}${earlyTipText} Reply to this email if you need to reschedule.

— Global Health`,
      html: wrapHtml(
        "Your appointment is tomorrow",
        `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Quick reminder — your <strong>${escapeHtml(opts.consultationType)}</strong> is tomorrow at:</p>
       <p style="margin:16px 0;font-size:18px;font-weight:700;color:#1B4D3E;">
         <time datetime="${escapeHtml(localHint)}">${escapeHtml(formatted)}</time>
       </p>
       ${doctorHtml}
       ${whereHtml}
       ${ctaHtml}
       <p>${earlyTipText} Reply if you need to reschedule.</p>`,
      ),
    },
    { recordLabel: "appointment_reminder_24h" },
  );
}

export async function sendContactFormEmail(opts: {
  to: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}) {
  return sendEmail({
    to: opts.to,
    replyTo: opts.senderEmail,
    subject: `Contact form: ${opts.subject}`,
    text: `New contact form submission\n\nFrom: ${opts.senderName} <${opts.senderEmail}>\nSubject: ${opts.subject}\n\n${opts.message}\n\n---\nReply directly to this email to respond to the sender.`,
    html: wrapHtml(
      "New contact form message",
      `<p><strong>From:</strong> ${escapeHtml(opts.senderName)} &lt;<a href="mailto:${escapeHtml(opts.senderEmail)}">${escapeHtml(opts.senderEmail)}</a>&gt;</p>
       <p><strong>Subject:</strong> ${escapeHtml(opts.subject)}</p>
       <hr style="margin:16px 0;border:0;border-top:1px solid #E5E5E3;" />
       <div style="white-space:pre-wrap;line-height:1.6;">${escapeHtml(opts.message)}</div>
       <p style="margin-top:24px;font-size:13px;color:#737373;">Reply directly to this email to respond to the sender.</p>`,
    ),
  });
}

export async function sendOrderConfirmationEmail(opts: {
  to: string;
  fullName: string;
  orderId: string;
  orderNumber?: string | null;
  totalLabel: string;
  items: { name: string; quantity: number; lineLabel: string }[];
  shipAddress?: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    countryCode: string;
  } | null;
  /**
   * Order contains a cross-border prescription line. These never ship — the
   * doctor finalizes the prescription and the patient is notified — so the
   * "we'll email you when it ships" copy below is wrong for them.
   */
  hasPrescriptionItem?: boolean;
}) {
  const shortId = formatOrderDisplayId({ id: opts.orderId, orderNumber: opts.orderNumber });
  const fulfillmentText = opts.shipAddress
    ? "We'll send a separate email when your items ship."
    : opts.hasPrescriptionItem
      ? "Once the doctor finalizes your prescription, you'll get a notification."
      : "We'll notify you as soon as your order is ready.";
  const fulfillmentHtml = opts.shipAddress
    ? "We'll send another email when it ships."
    : opts.hasPrescriptionItem
      ? "Once the doctor finalizes your prescription, you'll get a notification."
      : "We'll notify you as soon as it's ready.";
  const itemLines = opts.items
    .map((i) => `  - ${i.name} × ${i.quantity}  ${i.lineLabel}`)
    .join("\n");
  const shipText = opts.shipAddress
    ? `\n\nShipping to:\n  ${opts.shipAddress.name}\n  ${opts.shipAddress.line1}${opts.shipAddress.line2 ? `\n  ${opts.shipAddress.line2}` : ""}\n  ${opts.shipAddress.city} ${opts.shipAddress.postalCode}\n  ${opts.shipAddress.countryCode}`
    : "";
  const itemRowsHtml = opts.items
    .map(
      (i) => `
       <tr>
         <td style="padding:8px 0;border-bottom:1px solid #F1F1EF;">${escapeHtml(i.name)} <span style="color:#737373;">× ${i.quantity}</span></td>
         <td style="padding:8px 0;border-bottom:1px solid #F1F1EF;text-align:right;font-weight:600;">${escapeHtml(i.lineLabel)}</td>
       </tr>`,
    )
    .join("");
  const shipHtml = opts.shipAddress
    ? `<p style="margin-top:24px;"><strong>Shipping to:</strong></p>
       <p style="margin:6px 0;color:#374151;line-height:1.5;">
         ${escapeHtml(opts.shipAddress.name)}<br/>
         ${escapeHtml(opts.shipAddress.line1)}<br/>
         ${opts.shipAddress.line2 ? `${escapeHtml(opts.shipAddress.line2)}<br/>` : ""}
         ${escapeHtml(opts.shipAddress.city)} ${escapeHtml(opts.shipAddress.postalCode)}<br/>
         ${escapeHtml(opts.shipAddress.countryCode)}
       </p>`
    : "";
  return sendEmail({
    to: opts.to,
    subject: `Order confirmed #${shortId} — Global Health`,
    text: `Hi ${opts.fullName},

Your order is confirmed.

Order #${shortId}
${itemLines}

Total paid: ${opts.totalLabel}${shipText}

${fulfillmentText} Track your order any time at your account page.

— Global Health`,
    html: wrapHtml(
      "Order confirmed",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Your order is confirmed. ${escapeHtml(fulfillmentHtml)}</p>
       <p style="margin-top:16px;font-size:12px;color:#737373;">Order #${escapeHtml(shortId)}</p>
       <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;">
         ${itemRowsHtml}
         <tr>
           <td style="padding:12px 0;font-weight:700;">Total paid</td>
           <td style="padding:12px 0;text-align:right;font-weight:700;">${escapeHtml(opts.totalLabel)}</td>
         </tr>
       </table>
       ${shipHtml}
       <p style="margin-top:24px;font-size:13px;color:#737373;">
         Track your order any time at your account page. Reply to this
         email if you need anything.
       </p>`,
    ),
  });
}

export async function sendAbandonedCartEmail(opts: {
  to: string;
  fullName: string;
  itemCount: number;
  totalLabel: string;
}) {
  return sendAutomationEmail(
    {
      to: opts.to,
      subject: `Your cart is waiting — Global Health`,
      text: `Hi ${opts.fullName},

You left ${opts.itemCount} item${opts.itemCount === 1 ? "" : "s"} in your cart (${opts.totalLabel}).

Pick up where you left off — your cart is saved for you.

https://myglobalhealth.online/cart

— Global Health`,
      html: wrapHtml(
        "Your cart is waiting",
        `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>You left <strong>${opts.itemCount} item${opts.itemCount === 1 ? "" : "s"}</strong> in your cart (${escapeHtml(opts.totalLabel)}).</p>
       <p style="margin:24px 0;text-align:center;">
         <a href="${absoluteSiteUrl("/cart")}"
            style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">
           Resume checkout
         </a>
       </p>
       <p style="font-size:13px;color:#737373;">
         Reservations for consultation slots time out after 10 minutes,
         so please complete checkout soon if you have a slot held.
       </p>`,
      ),
    },
    { recordLabel: "abandoned_cart" },
  );
}

export async function sendBookingConfirmationEmail(opts: {
  to: string;
  fullName: string;
  consultationType: string;
  countryName: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Booking request received — ${opts.consultationType}`,
    text: `Hi ${opts.fullName},\n\nWe received your booking request for a ${opts.consultationType} in ${opts.countryName}. Our team will follow up by email within 24 hours to confirm the slot.\n\nIf you need to change anything, reply to this email.\n\n— Global Health`,
    html: wrapHtml(
      "Booking request received",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>We received your booking request for a <strong>${escapeHtml(opts.consultationType)}</strong> in <strong>${escapeHtml(opts.countryName)}</strong>. Our team will follow up by email within 24 hours to confirm the slot.</p>
       <p>If you need to change anything, just reply to this email.</p>
       <p style="font-size:13px;color:#737373;">You'll get a separate confirmation once a doctor is assigned.</p>`,
    ),
  });
}

export async function sendBrazilFinalizationEmail(opts: {
  to: string;
  patientName: string;
  appointmentId: string;
}) {
  const consentToken = createBrazilConsentToken(opts.appointmentId);
  const bookingUrl =
    env.BRAZIL_BOOKING_URL?.trim() ||
    absoluteSiteUrl(
      `/brazil/consent?appointmentId=${encodeURIComponent(opts.appointmentId)}&token=${encodeURIComponent(consentToken)}`,
    );
  return sendEmail({
    to: opts.to,
    subject: "Próximos passos — consentimento médico Brasil",
    text: `Olá ${opts.patientName},\n\nA sua consulta foi concluída. Para os próximos passos no Brasil, complete o consentimento e o pagamento de processamento:\n\n${bookingUrl}\n\n— Global Health`,
    html: wrapHtml(
      "Consulta concluída",
      `<p>Olá ${escapeHtml(opts.patientName)},</p>
       <p>A sua consulta foi concluída. Para os próximos passos no Brasil, complete o consentimento e o pagamento de processamento (€29).</p>
       <p style="margin:24px 0;text-align:center;"><a href="${bookingUrl}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Continuar</a></p>`,
    ),
  });
}

export async function sendReviewInviteEmail(opts: {
  to: string;
  patientName: string;
  link: string;
  localeTitle: string;
}) {
  return sendAutomationEmail(
    {
      to: opts.to,
      subject: `${opts.localeTitle} — Global Health`,
      text: `Hi ${opts.patientName},\n\nWe would love your feedback on your recent visit:\n\n${opts.link}\n\n— Global Health`,
      html: wrapHtml(
        opts.localeTitle,
        `<p>Hi ${escapeHtml(opts.patientName)},</p>
       <p>We would love your feedback on your recent visit.</p>
       <p style="margin:24px 0;text-align:center;"><a href="${opts.link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Leave a review</a></p>`,
      ),
    },
    { recordLabel: "review_invite" },
  );
}

export async function sendGeneratedDocumentEmail(opts: {
  to: string;
  patientName: string;
  documentType: string;
  fileName: string;
  attachment?: { filename: string; content: Buffer; contentType?: string };
}) {
  const noteText = opts.attachment
    ? `Your doctor has sent you ${opts.documentType.toLowerCase()} — see the attached file (${opts.fileName}).`
    : `Your doctor has issued ${opts.documentType.toLowerCase()} (${opts.fileName}). Please contact the clinic to receive a copy.`;
  const noteHtml = opts.attachment
    ? `<p>Your doctor has sent you <strong>${escapeHtml(opts.documentType)}</strong> — see the attached file (${escapeHtml(opts.fileName)}).</p>`
    : `<p>Your doctor has issued <strong>${escapeHtml(opts.documentType)}</strong> (${escapeHtml(opts.fileName)}). Please contact the clinic to receive a copy.</p>`;
  return sendEmail({
    to: opts.to,
    subject: `${opts.documentType} — Global Health`,
    text: `Hi ${opts.patientName},\n\n${noteText}\n\n— Global Health`,
    html: wrapHtml(
      opts.documentType,
      `<p>Hi ${escapeHtml(opts.patientName)},</p>
       ${noteHtml}`,
    ),
    ...(opts.attachment ? { attachments: [opts.attachment] } : {}),
  });
}


/**
 * A file the doctor picked off their own machine, named, and sent straight to
 * the patient from the appointment workspace. Distinct from
 * `sendGeneratedDocumentEmail` above, which carries a PDF the platform
 * generated from a template and so can describe it by type.
 *
 * The subject is `<document name> by <doctor>` verbatim — the patient's inbox
 * shows what arrived and who sent it without opening anything, and the doctor
 * chose that name knowing it would be read that way.
 */
export async function sendDoctorDocumentToPatientEmail(opts: {
  to: string;
  patientName: string;
  documentName: string;
  doctorName: string;
  attachment: { filename: string; content: Buffer; contentType?: string };
}) {
  const subject = `${opts.documentName} by ${opts.doctorName}`;
  return sendEmail({
    to: opts.to,
    subject,
    text: `Hi ${opts.patientName},\n\n${opts.doctorName} has sent you a document: ${opts.documentName}. It is attached to this email (${opts.attachment.filename}).\n\nIf you have any questions about it, reply to your doctor through your Global Health account.\n\n— Global Health`,
    html: wrapHtml(
      opts.documentName,
      `<p>Hi ${escapeHtml(opts.patientName)},</p>
       <p>${escapeHtml(opts.doctorName)} has sent you a document: <strong>${escapeHtml(opts.documentName)}</strong>. It is attached to this email (${escapeHtml(opts.attachment.filename)}).</p>
       <p>If you have any questions about it, reply to your doctor through your Global Health account.</p>`,
    ),
    attachments: [opts.attachment],
  });
}

/**
 * Sent after an admin merges a duplicate patient record into this
 * (surviving) patient. No PHI in the body — just notice that duplicate
 * files were consolidated, per Global Health's 1-patient-1-file policy.
 */
export async function sendPatientMergeNotificationEmail(opts: {
  to: string;
  patientName: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Your Global Health records were consolidated",
    text: `Hi ${opts.patientName},\n\nWe found more than one medical record on file for you and consolidated them into a single, secure file. This keeps your care history complete and accurate — it's part of our 1-patient-1-file policy.\n\nNothing further is required from you. If you have any questions, please contact our support team.\n\n— Global Health`,
    html: wrapHtml(
      "Your records were consolidated",
      `<p>Hi ${escapeHtml(opts.patientName)},</p>
       <p>We found more than one medical record on file for you and consolidated them into a single, secure file. This keeps your care history complete and accurate — it's part of our 1-patient-1-file policy.</p>
       <p>Nothing further is required from you. If you have any questions, please contact our support team.</p>`,
    ),
  });
}

export async function sendPatientUploadLinkEmail(opts: {
  to: string;
  patientName: string;
  link: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Upload your medical files — Global Health",
    text: `Hi ${opts.patientName},\n\nUse this secure link to upload your exam results for your doctor:\n\n${opts.link}\n\n— Global Health`,
    html: wrapHtml(
      "Upload your files",
      `<p>Hi ${escapeHtml(opts.patientName)},</p>
       <p>Use this secure link to upload your exam results for your doctor.</p>
       <p style="margin:24px 0;text-align:center;"><a href="${opts.link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Upload files</a></p>`,
    ),
  });
}

/**
 * Sent to the patient when a doctor in another country requests access to
 * their medical file. No PHI in the body — just who's asking and why, plus
 * a secure approve/deny link. Mirrors sendPatientUploadLinkEmail's shape.
 */
export async function sendMedicalAccessRequestEmail(opts: {
  to: string;
  patientName: string;
  doctorName: string;
  doctorCountry: string;
  reason: string;
  link: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "A doctor is requesting access to your medical file — Global Health",
    text: `Hi ${opts.patientName},\n\nDr. ${opts.doctorName} (${opts.doctorCountry}) is requesting access to your Global Health medical file:\n\n"${opts.reason}"\n\nReview and approve or deny this request:\n\n${opts.link}\n\nThis link expires in 14 days. If you don't recognize this request, you can safely deny it or ignore this email.\n\n— Global Health`,
    html: wrapHtml(
      "Medical file access request",
      `<p>Hi ${escapeHtml(opts.patientName)},</p>
       <p><strong>Dr. ${escapeHtml(opts.doctorName)}</strong> (${escapeHtml(opts.doctorCountry)}) is requesting access to your Global Health medical file:</p>
       <p style="font-style:italic;color:#555;">"${escapeHtml(opts.reason)}"</p>
       <p style="margin:24px 0;text-align:center;"><a href="${opts.link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Review request</a></p>
       <p style="font-size:13px;color:#777;">This link expires in 14 days. If you don't recognize this request, you can safely deny it or ignore this email.</p>`,
    ),
  });
}

/**
 * Invoice email copy, keyed by `Country.code` — ie, cz, es, ro, br. Portugal is
 * absent on purpose: PT invoices are issued through InvoiceExpress, not here.
 * Unknown keys fall back to `ie` (English) via `pick()` below.
 *
 * These were once keyed "sp"/"rm" (legacy Wix-era aliases) which match no real
 * order, so Spanish/Romanian patients silently received English email.
 */
const INVOICE_EMAIL_SUBJECT: Record<string, string> = {
  ie: "Your invoice {invoiceNumber} — Global Health",
  cz: "Vaše faktura {invoiceNumber} — Global Health",
  es: "Su factura {invoiceNumber} — Global Health",
  ro: "Factura dvs. {invoiceNumber} — Global Health",
  br: "Sua fatura {invoiceNumber} — Global Health",
};

const INVOICE_EMAIL_HEADING: Record<string, string> = {
  ie: "Your invoice",
  cz: "Vaše faktura",
  es: "Su factura",
  ro: "Factura dvs.",
  br: "Sua fatura",
};

const INVOICE_EMAIL_BODY: Record<string, string> = {
  ie: "Your invoice is ready. Click the button below to view and download it.",
  cz: "Vaše faktura je připravena. Klikněte na tlačítko níže pro zobrazení a stažení.",
  es: "Su factura está lista. Haga clic en el botón de abajo para verla y descargarla.",
  ro: "Factura dvs. este gata. Faceți clic pe butonul de mai jos pentru a o vizualiza și descărca.",
  br: "Sua fatura está pronta. Clique no botão abaixo para visualizá-la e baixá-la.",
};

const INVOICE_EMAIL_CTA: Record<string, string> = {
  ie: "View invoice",
  cz: "Zobrazit fakturu",
  es: "Ver factura",
  ro: "Vizualizați factura",
  br: "Ver fatura",
};

export type InvoiceEmailDocumentType = "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";

/**
 * Why a CREDIT_NOTE was issued. A CANCELLATION note voids an unpaid invoice —
 * nothing was ever charged, so the refund copy below must not be used for it.
 */
export type CreditNoteEmailReason = "REFUND" | "CANCELLATION";

/** Credit note (refund) — reverses a paid document. */
const CREDIT_NOTE_EMAIL_SUBJECT: Record<string, string> = {
  ie: "Your credit note {invoiceNumber} — refund processed",
  cz: "Váš dobropis {invoiceNumber} — vrácení peněz zpracováno",
  es: "Su nota de crédito {invoiceNumber} — reembolso procesado",
  ro: "Nota dvs. de credit {invoiceNumber} — rambursare procesată",
  br: "Sua nota de crédito {invoiceNumber} — reembolso processado",
};
const CREDIT_NOTE_EMAIL_HEADING: Record<string, string> = {
  ie: "Your credit note",
  cz: "Váš dobropis",
  es: "Su nota de crédito",
  ro: "Nota dvs. de credit",
  br: "Sua nota de crédito",
};
const CREDIT_NOTE_EMAIL_BODY: Record<string, string> = {
  ie: "Your refund has been processed. Your credit note is attached and available to view and download below.",
  cz: "Vaše vrácení peněz bylo zpracováno. Váš dobropis je přiložen a k dispozici k zobrazení a stažení níže.",
  es: "Su reembolso ha sido procesado. Su nota de crédito está adjunta y disponible para ver y descargar a continuación.",
  ro: "Rambursarea dvs. a fost procesată. Nota de credit este atașată și disponibilă pentru vizualizare și descărcare mai jos.",
  br: "Seu reembolso foi processado. Sua nota de crédito está anexada e disponível para visualização e download abaixo.",
};
const CREDIT_NOTE_EMAIL_CTA: Record<string, string> = {
  ie: "View credit note",
  cz: "Zobrazit dobropis",
  es: "Ver nota de crédito",
  ro: "Vizualizați nota de credit",
  br: "Ver nota de crédito",
};

/**
 * Credit note (cancellation) — voids an unpaid invoice after the booking was
 * cancelled for non-payment. Heading + CTA are shared with the refund copy above;
 * only the subject and body change, because there is no refund to announce.
 */
const CANCELLED_CREDIT_NOTE_EMAIL_SUBJECT: Record<string, string> = {
  ie: "Your credit note {invoiceNumber} — invoice cancelled",
  cz: "Váš dobropis {invoiceNumber} — faktura stornována",
  es: "Su nota de crédito {invoiceNumber} — factura anulada",
  ro: "Nota dvs. de credit {invoiceNumber} — factură anulată",
  br: "Sua nota de crédito {invoiceNumber} — fatura cancelada",
};
const CANCELLED_CREDIT_NOTE_EMAIL_BODY: Record<string, string> = {
  ie: "Your booking was cancelled because payment was not received, so your invoice has been cancelled. No payment was taken. Your credit note is attached and available to view and download below.",
  cz: "Vaše rezervace byla zrušena, protože platba nebyla přijata, a proto byla vaše faktura stornována. Žádná platba nebyla stržena. Váš dobropis je přiložen a k dispozici k zobrazení a stažení níže.",
  es: "Su reserva fue cancelada porque no se recibió el pago, por lo que su factura ha sido anulada. No se realizó ningún cobro. Su nota de crédito está adjunta y disponible para ver y descargar a continuación.",
  ro: "Programarea dvs. a fost anulată deoarece plata nu a fost primită, prin urmare factura dvs. a fost anulată. Nu a fost efectuată nicio plată. Nota de credit este atașată și disponibilă pentru vizualizare și descărcare mai jos.",
  br: "Sua reserva foi cancelada porque o pagamento não foi recebido, portanto sua fatura foi cancelada. Nenhum pagamento foi cobrado. Sua nota de crédito está anexada e disponível para visualização e download abaixo.",
};

/** Per-document-type overrides. Falls back to the invoice (INVOICE_RECEIPT) copy above. */
const RECEIPT_EMAIL_SUBJECT: Record<string, string> = {
  ie: "Your receipt {invoiceNumber} — Global Health",
  cz: "Vaše účtenka {invoiceNumber} — Global Health",
  es: "Su recibo {invoiceNumber} — Global Health",
  ro: "Chitanța dvs. {invoiceNumber} — Global Health",
  br: "Seu recibo {invoiceNumber} — Global Health",
};
const RECEIPT_EMAIL_HEADING: Record<string, string> = {
  ie: "Your receipt",
  cz: "Vaše účtenka",
  es: "Su recibo",
  ro: "Chitanța dvs.",
  br: "Seu recibo",
};
const RECEIPT_EMAIL_BODY: Record<string, string> = {
  ie: "We have received your payment — thank you. Your receipt is ready to view and download below.",
  cz: "Vaši platbu jsme obdrželi — děkujeme. Vaše účtenka je připravena k zobrazení a stažení níže.",
  es: "Hemos recibido su pago — gracias. Su recibo está listo para ver y descargar a continuación.",
  ro: "Am primit plata dumneavoastră — vă mulțumim. Chitanța este gata de vizualizat și descărcat mai jos.",
  br: "Recebemos seu pagamento — obrigado. Seu recibo está pronto para visualização e download abaixo.",
};
const RECEIPT_EMAIL_CTA: Record<string, string> = {
  ie: "View receipt",
  cz: "Zobrazit účtenku",
  es: "Ver recibo",
  ro: "Vizualizați chitanța",
  br: "Ver recibo",
};

/** Unpaid invoice (manual / AI booking) — asks the patient to pay. */
const UNPAID_INVOICE_EMAIL_SUBJECT: Record<string, string> = {
  ie: "Your invoice {invoiceNumber} — payment required",
  cz: "Vaše faktura {invoiceNumber} — vyžaduje platbu",
  es: "Su factura {invoiceNumber} — pago pendiente",
  ro: "Factura dvs. {invoiceNumber} — necesită plată",
  br: "Sua fatura {invoiceNumber} — pagamento pendente",
};
const UNPAID_INVOICE_EMAIL_BODY: Record<string, string> = {
  ie: "Your invoice is ready. Please click below to view it and complete your payment.",
  cz: "Vaše faktura je připravena. Klikněte níže pro zobrazení a dokončení platby.",
  es: "Su factura está lista. Haga clic abajo para verla y completar el pago.",
  ro: "Factura dvs. este gata. Faceți clic mai jos pentru a o vizualiza și a finaliza plata.",
  br: "Sua fatura está pronta. Clique abaixo para visualizá-la e concluir o pagamento.",
};

/**
 * Greeting / sign-off chrome, keyed by `Country.code`. A table rather than nested
 * `cc === "xx"` ternaries — those are what let the dead "sp"/"rm" aliases hide.
 */
const INVOICE_EMAIL_CHROME: Record<
  string,
  {
    dear: string;
    contactLead: string;
    whatsappLead: string;
    signOff: string;
    team: string;
    orPaste: string;
  }
> = {
  ie: {
    dear: "Dear",
    contactLead: "If you have any questions, feel free to contact us at",
    whatsappLead: "or message us on WhatsApp",
    signOff: "Warm regards,",
    team: "The Global Health Team",
    orPaste: "Or paste this URL into your browser:",
  },
  cz: {
    dear: "Vážený/á",
    contactLead: "Máte-li dotazy, kontaktujte nás na",
    whatsappLead: "nebo nám napište na WhatsApp",
    signOff: "S pozdravem,",
    team: "Tým Global Health",
    orPaste: "Nebo vložte tuto adresu URL do svého prohlížeče:",
  },
  es: {
    dear: "Estimado/a",
    contactLead: "Si tiene alguna pregunta, contáctenos en",
    whatsappLead: "o envíenos un mensaje por WhatsApp",
    signOff: "Saludos cordiales,",
    team: "El equipo de Global Health",
    orPaste: "O pegue esta URL en su navegador:",
  },
  ro: {
    dear: "Stimate",
    contactLead: "Dacă aveți întrebări, contactați-ne la",
    whatsappLead: "sau trimiteți-ne un mesaj pe WhatsApp",
    signOff: "Cu stimă,",
    team: "Echipa Global Health",
    orPaste: "Sau inserați acest URL în browser:",
  },
  br: {
    dear: "Prezado(a)",
    contactLead: "Em caso de dúvidas, entre em contato conosco pelo",
    whatsappLead: "ou envie uma mensagem no WhatsApp",
    signOff: "Atenciosamente,",
    team: "Equipe Global Health",
    orPaste: "Ou cole este URL no seu navegador:",
  },
};

export async function sendInvoiceEmail(opts: {
  to: string;
  fullName: string;
  invoiceNumber: string;
  invoiceUrl: string;
  countryCode: string;
  pdfBuffer?: Buffer;
  /** Drives the wording. Defaults to the combined invoice/receipt copy. */
  documentType?: InvoiceEmailDocumentType;
  /** CREDIT_NOTE only. Defaults to REFUND — the original credit-note cause. */
  creditNoteReason?: CreditNoteEmailReason | null;
}) {
  const cc = opts.countryCode.toLowerCase();
  const docType = opts.documentType ?? "INVOICE_RECEIPT";
  const isReceipt = docType === "RECEIPT";
  const isUnpaidInvoice = docType === "INVOICE";
  const isCreditNote = docType === "CREDIT_NOTE";
  const isCancellationNote = isCreditNote && opts.creditNoteReason === "CANCELLATION";

  const pick = (m: Record<string, string>) => m[cc] ?? m.ie!;
  const subjectTemplate = isCancellationNote
    ? pick(CANCELLED_CREDIT_NOTE_EMAIL_SUBJECT)
    : isCreditNote
      ? pick(CREDIT_NOTE_EMAIL_SUBJECT)
      : isReceipt
        ? pick(RECEIPT_EMAIL_SUBJECT)
        : isUnpaidInvoice
          ? pick(UNPAID_INVOICE_EMAIL_SUBJECT)
          : pick(INVOICE_EMAIL_SUBJECT);
  const subject = subjectTemplate.replace("{invoiceNumber}", opts.invoiceNumber);
  const heading = isCreditNote
    ? pick(CREDIT_NOTE_EMAIL_HEADING)
    : isReceipt
      ? pick(RECEIPT_EMAIL_HEADING)
      : pick(INVOICE_EMAIL_HEADING);
  const body = isCancellationNote
    ? pick(CANCELLED_CREDIT_NOTE_EMAIL_BODY)
    : isCreditNote
      ? pick(CREDIT_NOTE_EMAIL_BODY)
      : isReceipt
        ? pick(RECEIPT_EMAIL_BODY)
        : isUnpaidInvoice
          ? pick(UNPAID_INVOICE_EMAIL_BODY)
          : pick(INVOICE_EMAIL_BODY);
  const cta = isCreditNote
    ? pick(CREDIT_NOTE_EMAIL_CTA)
    : isReceipt
      ? pick(RECEIPT_EMAIL_CTA)
      : pick(INVOICE_EMAIL_CTA);
  const filenamePrefix = isCreditNote ? "credit-note" : isReceipt ? "receipt" : "invoice";

  const { resolveEmailLogoUrl } = await import("./resolve-email-logo-url.js");
  const logoSrc = await resolveEmailLogoUrl();

  const WHATSAPP_URL = "https://wa.me/353894715849";
  const WHATSAPP_DISPLAY = "+353 89 471 5849";
  const SUPPORT_EMAIL = "globalhealth@myglobalhealth.online";

  const { dear, contactLead, whatsappLead, signOff, team, orPaste } =
    INVOICE_EMAIL_CHROME[cc] ?? INVOICE_EMAIL_CHROME.ie!;

  const html = `<div style="background-color:#f4f1ea;padding:20px;font-family:Georgia,'Times New Roman',serif;color:#333;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.1);max-width:100%;">
    <tr>
      <td align="center" style="background-color:#2d4f3d;padding:30px;">
        <img src="${escapeHtml(logoSrc)}" alt="Global Health" width="180" style="display:block;max-width:180px;height:auto;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:25px 20px;border-bottom:1px solid #eeeeee;">
        <h2 style="color:#2d4f3d;letter-spacing:2px;margin:0;font-size:22px;font-weight:700;">
          ${escapeHtml(opts.invoiceNumber)} &nbsp;·&nbsp; ${escapeHtml(heading.toUpperCase())}
        </h2>
      </td>
    </tr>
    <tr>
      <td style="padding:40px;line-height:1.6;font-size:15px;">
        <p style="margin:0 0 16px;">${dear} ${escapeHtml(opts.fullName)},</p>
        <p style="margin:0 0 20px;">${body}</p>
        <p style="margin:28px 0;text-align:center;">
          <a href="${escapeHtml(opts.invoiceUrl)}"
             style="background-color:#2d4f3d;color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
            ${cta}
          </a>
        </p>
        <p style="font-size:13px;color:#737373;">
          ${orPaste}<br/>
          <a href="${escapeHtml(opts.invoiceUrl)}" style="color:#2d4f3d;">${escapeHtml(opts.invoiceUrl)}</a>
        </p>
        <p style="font-size:12px;color:#737373;margin-top:16px;">Invoice reference: ${escapeHtml(opts.invoiceNumber)}</p>
        <p style="font-size:14px;color:#444;margin:24px 0 0;">
          ${contactLead}
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d4f3d;">${SUPPORT_EMAIL}</a>
          ${whatsappLead}
          <a href="${WHATSAPP_URL}" style="color:#2d4f3d;font-weight:bold;">${WHATSAPP_DISPLAY}</a>.
        </p>
        <p style="margin:28px 0 0;font-size:14px;">
          ${signOff}<br/>
          <b>${team}</b>
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:24px;background-color:#fafaf8;border-top:1px solid #eeeeee;font-size:12px;color:#777;">
        <a href="https://www.myglobalhealth.online" style="color:#2d4f3d;text-decoration:none;font-weight:bold;">www.myglobalhealth.online</a>
      </td>
    </tr>
  </table>
</div>`;

  return sendEmail({
    to: opts.to,
    subject,
    text: `${dear} ${opts.fullName},\n\n${body}\n\n${opts.invoiceUrl}\n\nInvoice reference: ${opts.invoiceNumber}\n\n${signOff}\n${team}`,
    html,
    attachments: opts.pdfBuffer
      ? [
          {
            filename: `${filenamePrefix}-${opts.invoiceNumber}.pdf`,
            content: opts.pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined,
  });
}

export async function sendDoctorPatientUploadNotificationEmail(opts: {
  to: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  fileLabel: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Patient uploaded exam results — ${opts.patientName}`,
    text:
      `Hi ${opts.doctorName},\n\n` +
      `${opts.patientName} (${opts.patientEmail}) has uploaded a file via their exam prescription link:\n\n` +
      `${opts.fileLabel}\n\n` +
      `Log in to the doctor dashboard to review the file.\n\n— Global Health`,
    html: wrapHtml(
      "Patient uploaded exam results",
      `<p>Hi ${escapeHtml(opts.doctorName)},</p>
       <p><strong>${escapeHtml(opts.patientName)}</strong> (${escapeHtml(opts.patientEmail)}) has uploaded a file via their exam prescription link:</p>
       <p style="background:#f4f7f5;border-left:4px solid #1B4D3E;padding:10px 14px;border-radius:4px;">${escapeHtml(opts.fileLabel)}</p>
       <p>Log in to the doctor dashboard to review the file.</p>`,
    ),
  });
}
