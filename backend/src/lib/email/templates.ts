import { absoluteSiteUrl, sendEmail } from "./send-email.js";

/** Shared, minimal transactional email shell — works in plain-text clients
 *  and renders neatly in HTML clients. Avoid heavy inline CSS so the message
 *  doesn't trip aggressive spam filters. */
function wrapHtml(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:32px auto;padding:0 16px;color:#0F2E25;">
  <h2 style="color:#1B4D3E;margin:0 0 16px;">${escapeHtml(title)}</h2>
  ${bodyHtml}
  <hr style="margin-top:32px;border:0;border-top:1px solid #E5E5E3;" />
  <p style="font-size:12px;color:#737373;">Global Health · Medicine without borders</p>
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
