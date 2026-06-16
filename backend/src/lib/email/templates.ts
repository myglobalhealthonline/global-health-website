import { env } from "../../config/env.js";
import { sendAutomationEmail } from "../../modules/automation/send-automation-notification.js";
import { formatOrderDisplayId } from "../../modules/automation/automation-catalog.js";
import { absoluteSiteUrl, sendEmail } from "./send-email.js";
import { createBrazilConsentToken } from "../../modules/brazil-consent/brazil-consent-link.service.js";

/** Shared, minimal transactional email shell — works in plain-text clients
 *  and renders neatly in HTML clients. Avoid heavy inline CSS so the message
 *  doesn't trip aggressive spam filters. */
export function wrapHtml(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:32px auto;padding:0 16px;color:#0F2E25;">
  <h2 style="color:#1B4D3E;margin:0 0 16px;">${escapeHtml(title)}</h2>
  ${bodyHtml}
  <hr style="margin-top:32px;border:0;border-top:1px solid #E5E5E3;" />
  <p style="font-size:12px;color:#737373;">Global Health · Medicine anytime anywhere</p>
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
       <p style="margin:24px 0;"><a href="${link}" style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Reset password</a></p>
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
       <p style="margin:24px 0;"><a href="${link}" style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Set password &amp; sign in</a></p>
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
       <p style="margin:24px 0;"><a href="${link}" style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Confirm email</a></p>
       <p style="font-size:13px;color:#737373;">Or paste into your browser:<br/><a href="${link}">${escapeHtml(link)}</a></p>
       <p>The link expires in 24 hours.</p>`,
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
}) {
  const formatted = opts.scheduledAt.toUTCString();
  const localHint = opts.scheduledAt.toISOString();
  const meetLink = opts.meetingUrl?.trim() || null;
  const where = opts.where?.trim() || null;

  const joinText = meetLink
    ? `Join the call here when it's time:\n${meetLink}\n\n`
    : "";
  const whereText = where ? `Where: ${where}\n\n` : "";
  const earlyTipText = meetLink
    ? "open the link 5 minutes early to test your camera and mic."
    : "plan to arrive 5–10 minutes early.";

  const ctaHtml = meetLink
    ? `<p style="margin:24px 0;">
         <a href="${escapeHtml(meetLink)}"
            style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
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

  return sendEmail({
    to: opts.to,
    subject: `Your appointment is scheduled — ${opts.consultationType}`,
    text: `Hi ${opts.fullName},

Your ${opts.consultationType} is scheduled for ${formatted}.

${whereText}${joinText}Tip: ${earlyTipText} If you need to reschedule, reply to this email.

— Global Health`,
    html: wrapHtml(
      "Your appointment is scheduled",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Your <strong>${escapeHtml(opts.consultationType)}</strong> is scheduled for:</p>
       <p style="margin:16px 0;font-size:18px;font-weight:700;color:#1B4D3E;">
         <time datetime="${escapeHtml(localHint)}">${escapeHtml(formatted)}</time>
       </p>
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
}) {
  const formatted = opts.scheduledAt.toUTCString();
  const localHint = opts.scheduledAt.toISOString();
  const meetLink = opts.meetingUrl?.trim() || null;
  const where = opts.where?.trim() || null;
  const joinText = meetLink
    ? `Join the call:\n${meetLink}\n\n`
    : "";
  const whereText = where ? `Where: ${where}\n\n` : "";
  const earlyTipText = meetLink
    ? "Open it 5 minutes early to test camera + mic."
    : "Plan to arrive 5–10 minutes early.";

  const ctaHtml = meetLink
    ? `<p style="margin:24px 0;">
         <a href="${escapeHtml(meetLink)}"
            style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
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

  return sendAutomationEmail(
    {
      to: opts.to,
      subject: `Reminder: your appointment tomorrow — ${opts.consultationType}`,
      text: `Hi ${opts.fullName},

Quick reminder — your ${opts.consultationType} is tomorrow at ${formatted}.

${whereText}${joinText}${earlyTipText} Reply to this email if you need to reschedule.

— Global Health`,
      html: wrapHtml(
        "Your appointment is tomorrow",
        `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Quick reminder — your <strong>${escapeHtml(opts.consultationType)}</strong> is tomorrow at:</p>
       <p style="margin:16px 0;font-size:18px;font-weight:700;color:#1B4D3E;">
         <time datetime="${escapeHtml(localHint)}">${escapeHtml(formatted)}</time>
       </p>
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
}) {
  const shortId = formatOrderDisplayId({ id: opts.orderId, orderNumber: opts.orderNumber });
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

We'll send a separate email when your items ship. Track your order any time at your account page.

— Global Health`,
    html: wrapHtml(
      "Order confirmed",
      `<p>Hi ${escapeHtml(opts.fullName)},</p>
       <p>Your order is confirmed and being prepared. We'll send another email when it ships.</p>
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
       <p style="margin:24px 0;">
         <a href="${absoluteSiteUrl("/cart")}"
            style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
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
       <p style="margin:24px 0;"><a href="${bookingUrl}" style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Continuar</a></p>`,
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
       <p style="margin:24px 0;"><a href="${opts.link}" style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Leave a review</a></p>`,
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
       <p style="margin:24px 0;"><a href="${opts.link}" style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Upload files</a></p>`,
    ),
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
