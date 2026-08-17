import { absoluteSiteUrl, sendEmail } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function button(link: string, label: string): string {
  return `<p style="margin:24px 0;text-align:center;"><a href="${link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">${escapeHtml(label)}</a></p>
  <p style="font-size:13px;color:#737373;">Or paste this URL into your browser:<br/><a href="${link}">${escapeHtml(link)}</a></p>`;
}

export function corporateInviteLink(token: string): string {
  return absoluteSiteUrl(`/corporate-invite/${encodeURIComponent(token)}`);
}

/** Member invite (employee or beneficiary). Also used verbatim for the
 *  WhatsApp text — keep the copy channel-neutral. */
export function memberInviteText(opts: {
  firstName: string;
  companyName: string;
  isBeneficiary: boolean;
  link: string;
}): string {
  const intro = opts.isBeneficiary
    ? `you have been added to ${opts.companyName}'s Global Health Corporate Plan as a family/extended beneficiary`
    : `${opts.companyName} has added you to its Global Health Corporate Plan`;
  return `Hi ${opts.firstName}, ${intro}. Set up your account to activate your digital benefit card and member discount: ${opts.link} (link expires in 7 days).`;
}

export async function sendCorporateMemberInviteEmail(opts: {
  to: string;
  firstName: string;
  companyName: string;
  isBeneficiary: boolean;
  token: string;
  isReminder?: boolean;
}) {
  const link = corporateInviteLink(opts.token);
  const heading = opts.isBeneficiary
    ? "You've been added as a beneficiary"
    : "Welcome to your company health plan";
  const lead = opts.isBeneficiary
    ? `You have been added to <strong>${escapeHtml(opts.companyName)}</strong>'s Global Health Corporate Plan as a family/extended beneficiary.`
    : `<strong>${escapeHtml(opts.companyName)}</strong> has added you to its Global Health Corporate Plan.`;
  const nextStep = opts.isBeneficiary
    ? "Set up your account and complete your profile to activate your digital benefit card and member discount."
    : "Set up your account, complete your profile and book your initial pre-assessment consultation to activate your membership.";
  return sendEmail({
    to: opts.to,
    subject: `${opts.isReminder ? "Reminder: " : ""}You're invited — Global Health Corporate Plan`,
    text: `${memberInviteText({ firstName: opts.firstName, companyName: opts.companyName, isBeneficiary: opts.isBeneficiary, link })}\n\n— Global Health`,
    html: wrapHtml(
      heading,
      `<p>Hi ${escapeHtml(opts.firstName)},</p>
       <p>${lead}</p>
       <p>${escapeHtml(nextStep)}</p>
       ${button(link, "Accept invitation")}
       <p style="font-size:13px;color:#737373;">The link expires in 7 days. If you didn't expect this invite, you can ignore this email.</p>`,
    ),
  });
}

export async function sendCorporateAdminInviteEmail(opts: {
  to: string;
  contactName: string;
  companyName: string;
  token: string;
}) {
  const link = absoluteSiteUrl(`/reset-password?token=${encodeURIComponent(opts.token)}&invite=1`);
  return sendEmail({
    to: opts.to,
    subject: "Your Global Health corporate portal access",
    text: `Hi ${opts.contactName},\n\nA corporate portal account for ${opts.companyName} has been set up for you. Set your password to sign in and start adding employees:\n\n${link}\n\nThe link expires in 7 days.\n\n— Global Health`,
    html: wrapHtml(
      "Corporate portal access",
      `<p>Hi ${escapeHtml(opts.contactName)},</p>
       <p>A corporate portal account for <strong>${escapeHtml(opts.companyName)}</strong> has been set up for you. Set your password to sign in and start adding employees.</p>
       ${button(link, "Set password & sign in")}
       <p style="font-size:13px;color:#737373;">The link expires in 7 days.</p>`,
    ),
  });
}

export async function sendCorporateRequestEmail(opts: {
  to: string;
  firstName: string;
  companyName: string;
  requestLabel: string; // "Illness Benefit Consultation" | "Fit-for-Work Consultation"
  bookPath: string; // site-relative booking deep link
}) {
  const link = absoluteSiteUrl(opts.bookPath);
  return sendEmail({
    to: opts.to,
    subject: `${opts.requestLabel} requested — Global Health`,
    text: `Hi ${opts.firstName},\n\n${opts.companyName} has requested a ${opts.requestLabel} for you. Book your appointment here:\n\n${link}\n\n— Global Health`,
    html: wrapHtml(
      `${opts.requestLabel} requested`,
      `<p>Hi ${escapeHtml(opts.firstName)},</p>
       <p><strong>${escapeHtml(opts.companyName)}</strong> has requested a <strong>${escapeHtml(opts.requestLabel)}</strong> for you.</p>
       ${button(link, "Book your appointment")}`,
    ),
  });
}

export function corporateRequestText(opts: {
  firstName: string;
  companyName: string;
  requestLabel: string;
  bookPath: string;
}): string {
  return `Hi ${opts.firstName}, ${opts.companyName} has requested a ${opts.requestLabel} for you via Global Health. Book here: ${absoluteSiteUrl(opts.bookPath)}`;
}

export async function sendCardActivatedEmail(opts: {
  to: string;
  firstName: string;
  companyName: string;
  cardNumber: string;
}) {
  const link = absoluteSiteUrl("/account/corporate");
  return sendEmail({
    to: opts.to,
    subject: "Your Global Health benefit card is active",
    text: `Hi ${opts.firstName},\n\nYour corporate membership with ${opts.companyName} is now active. Your digital benefit card (${opts.cardNumber}) is available in your account:\n\n${link}\n\n— Global Health`,
    html: wrapHtml(
      "Your benefit card is active",
      `<p>Hi ${escapeHtml(opts.firstName)},</p>
       <p>Your corporate membership with <strong>${escapeHtml(opts.companyName)}</strong> is now active.</p>
       <p>Digital benefit card: <strong>${escapeHtml(opts.cardNumber)}</strong></p>
       ${button(link, "View your card")}`,
    ),
  });
}

/**
 * Booking confirmation for a corporate consultation.
 *
 * Catalogue bookings get theirs from the order-keyed post-payment automation
 * (`post-payment-flow.service.ts`), which loads its whole context from an
 * `Order`. A corporate consultation deliberately mints none, so it could never
 * enter that pipeline and the member was left with no confirmation at all.
 * Unlike the catalogue "request received" note, the slot here is already
 * confirmed, so the copy states the time rather than promising a follow-up.
 */
export type CorporateBookingCopy = {
  firstName: string;
  consultationName: string;
  doctorName: string | null;
  when: string;
  /** Null when Meet is unconfigured or provisioning failed — the copy then
   *  points at the bookings page instead of promising a link. */
  meetingUrl: string | null;
};

export async function sendCorporateBookingConfirmationEmail(
  opts: CorporateBookingCopy & { to: string },
) {
  const link = absoluteSiteUrl("/account/bookings");
  const withDoctor = opts.doctorName ? ` with ${opts.doctorName}` : "";
  const joinLine = opts.meetingUrl
    ? `Join here at the appointment time: ${opts.meetingUrl}`
    : "The video link appears on your bookings page once the clinic adds it.";
  return sendEmail({
    to: opts.to,
    subject: `Booking confirmed — ${opts.consultationName}`,
    text: `Hi ${opts.firstName},\n\nYour ${opts.consultationName}${withDoctor} is booked for ${opts.when}.\n\nIt is covered by your corporate plan — there is nothing to pay.\n\n${joinLine}\n\nSee your bookings: ${link}\n\n— Global Health`,
    html: wrapHtml(
      "Booking confirmed",
      `<p>Hi ${escapeHtml(opts.firstName)},</p>
       <p>Your <strong>${escapeHtml(opts.consultationName)}</strong>${escapeHtml(withDoctor)} is booked for <strong>${escapeHtml(opts.when)}</strong>.</p>
       <p>It is covered by your corporate plan — there is nothing to pay.</p>
       ${
         opts.meetingUrl
           ? `<p>Join here at the appointment time:<br/><a href="${opts.meetingUrl}">${escapeHtml(opts.meetingUrl)}</a></p>${button(opts.meetingUrl, "Join the consultation")}`
           : `<p>The video link appears on your bookings page once the clinic adds it.</p>${button(link, "View your bookings")}`
       }`,
    ),
  });
}

/** Same copy, channel-neutral, for the WhatsApp send. */
export function corporateBookingText(opts: CorporateBookingCopy): string {
  const withDoctor = opts.doctorName ? ` with ${opts.doctorName}` : "";
  const tail = opts.meetingUrl
    ? `Join here at the appointment time: ${opts.meetingUrl}`
    : `Your bookings: ${absoluteSiteUrl("/account/bookings")}`;
  return `Hi ${opts.firstName}, your ${opts.consultationName}${withDoctor} is booked for ${opts.when}. It is covered by your corporate plan — nothing to pay. ${tail}`;
}

/** Doctor-side copy. Deliberately omits the employer, matching the doctor
 *  queue's own rule — the assigned doctor is told which corporate flow the
 *  booking came from, never which company the patient works for. */
export type CorporateDoctorBookingCopy = {
  doctorName: string;
  patientName: string;
  consultationName: string;
  when: string;
  meetingUrl: string | null;
};

export async function sendCorporateDoctorBookingEmail(
  opts: CorporateDoctorBookingCopy & { to: string },
) {
  const link = absoluteSiteUrl("/doctor/appointments");
  const joinLine = opts.meetingUrl
    ? `Join here at the appointment time: ${opts.meetingUrl}`
    : "The video link will be added to the appointment.";
  return sendEmail({
    to: opts.to,
    subject: `New corporate consultation — ${opts.when}`,
    text: `Hi ${opts.doctorName},\n\n${opts.patientName} has booked a ${opts.consultationName} with you for ${opts.when}.\n\nThis is a corporate-plan consultation — free to the member and outside the payout statement.\n\n${joinLine}\n\nYour queue: ${link}\n\n— Global Health`,
    html: wrapHtml(
      "New corporate consultation",
      `<p>Hi ${escapeHtml(opts.doctorName)},</p>
       <p><strong>${escapeHtml(opts.patientName)}</strong> has booked a <strong>${escapeHtml(opts.consultationName)}</strong> with you for <strong>${escapeHtml(opts.when)}</strong>.</p>
       <p>This is a corporate-plan consultation — free to the member and outside the payout statement.</p>
       ${
         opts.meetingUrl
           ? `<p>Join here at the appointment time:<br/><a href="${opts.meetingUrl}">${escapeHtml(opts.meetingUrl)}</a></p>`
           : "<p>The video link will be added to the appointment.</p>"
       }
       ${button(link, "Open your queue")}`,
    ),
  });
}

export function corporateDoctorBookingText(opts: CorporateDoctorBookingCopy): string {
  const tail = opts.meetingUrl
    ? `Join: ${opts.meetingUrl}`
    : `Your queue: ${absoluteSiteUrl("/doctor/appointments")}`;
  return `Hi ${opts.doctorName}, ${opts.patientName} booked a ${opts.consultationName} with you for ${opts.when} (corporate plan — free to the member). ${tail}`;
}

export function cardActivatedText(opts: {
  firstName: string;
  companyName: string;
  cardNumber: string;
}): string {
  return `Hi ${opts.firstName}, your Global Health corporate membership with ${opts.companyName} is active. Benefit card ${opts.cardNumber}: ${absoluteSiteUrl("/account/corporate")}`;
}

export async function sendMembershipStatusEmail(opts: {
  to: string;
  firstName: string;
  companyName: string;
  statusLabel: "suspended" | "expired" | "reactivated";
}) {
  const verb =
    opts.statusLabel === "reactivated"
      ? "has been reactivated"
      : `has been ${opts.statusLabel}`;
  return sendEmail({
    to: opts.to,
    subject: `Your corporate membership ${verb} — Global Health`,
    text: `Hi ${opts.firstName},\n\nYour Global Health corporate membership with ${opts.companyName} ${verb}.${opts.statusLabel === "reactivated" ? " Your benefit card and member discount are available again." : " Your benefit card and member discount are paused."}\n\n— Global Health`,
    html: wrapHtml(
      `Membership ${opts.statusLabel}`,
      `<p>Hi ${escapeHtml(opts.firstName)},</p>
       <p>Your Global Health corporate membership with <strong>${escapeHtml(opts.companyName)}</strong> ${verb}.</p>
       <p>${opts.statusLabel === "reactivated" ? "Your benefit card and member discount are available again." : "Your benefit card and member discount are paused. Contact your company admin with any questions."}</p>`,
    ),
  });
}

/** Ops notices to the company's contact email (registration/booking milestones). */
export async function sendCompanyNoticeEmail(opts: {
  to: string;
  contactName: string;
  subject: string;
  bodyLines: string[];
}) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.subject} — Global Health Corporate`,
    text: `Hi ${opts.contactName},\n\n${opts.bodyLines.join("\n")}\n\n— Global Health`,
    html: wrapHtml(
      opts.subject,
      `<p>Hi ${escapeHtml(opts.contactName)},</p>
       ${opts.bodyLines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}`,
    ),
  });
}
