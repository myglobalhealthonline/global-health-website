import { CartItemKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { resolveEmailLogoUrl } from "../../lib/email/resolve-email-logo-url.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import type { PhoneNormalizeHints } from "../../lib/whatsapp/normalize-phone.js";
import { appendPatientPortalWhatsApp } from "./pre-payment-messages.js";
import { resolveOrderPortalAccess } from "./resolve-order-portal-access.service.js";
import type { PrePaymentEmailPortalAccess } from "./pre-payment-email-template.js";
import {
  formatDoctorDisplayName,
  resolveDoctorContact,
} from "../../lib/whatsapp/resolve-doctor-contact.js";
import { formatOrderDisplayId } from "./automation-catalog.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import {
  detectAutomationLanguage,
  pendingAppointmentDateLabel,
  prefixServiceName,
} from "./pre-payment-messages.js";
import { formatOrderTotal, resolvePatientFullName, splitPatientName } from "./pre-payment-email-template.js";
import { sendAutomationEmail } from "./send-automation-notification.js";
import {
  buildPostPaymentDoctorEmailHtml,
  buildPostPaymentDoctorEmailText,
  buildPostPaymentPatientEmailHtml,
  buildPostPaymentPatientEmailText,
  type PostPaymentEmailVariant,
} from "./post-payment-email-template.js";
import {
  doctorEmailSubjectMeetingLink,
  doctorEmailSubjectOneHour,
  doctorEmailSubjectSessionStart,
  doctorWhatsAppMeetingLink,
  doctorWhatsAppOneHourReminder,
  doctorWhatsAppSessionStart,
  formatDeadline,
  formatMeetingLinkDisplay,
  patientEmailSubjectConfirmed,
  patientEmailSubjectOneHour,
  patientEmailSubjectSessionStart,
  patientWhatsAppMeetingLink,
  patientWhatsAppOneHourReminder,
  patientWhatsAppSessionStart,
  type PostPaymentMessageContext,
} from "./post-payment-messages.js";

const MS_MINUTE = 60 * 1000;

const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

/** Stage 1 — payment confirmation sent. */
export const POST_PAYMENT_STAGE_PAID = 1;
/** Stage 2 — meeting link notifications sent. */
export const POST_PAYMENT_STAGE_MEETING_LINK = 2;
/** Stage 3 — 1-hour reminder sent. */
export const POST_PAYMENT_STAGE_ONE_HOUR = 3;
/** Stage 4 — 5-minute reminder sent. */
export const POST_PAYMENT_STAGE_SESSION_START = 4;
export const POST_PAYMENT_STAGE_FIVE_MIN = POST_PAYMENT_STAGE_SESSION_START;

async function resolveConsultationStartForOrder(orderId: string): Promise<Date | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { kind: { in: CONSULTATION_KINDS } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!order) return null;

  const slotId = order.items.find((i) => i.timeSlotId)?.timeSlotId ?? null;
  if (slotId) {
    const slot = await prisma.doctorTimeSlot.findUnique({
      where: { id: slotId },
      select: { startAt: true },
    });
    if (slot?.startAt) return slot.startAt;
  }

  const linkedAppointmentId =
    order.items.find((i) => i.appointmentId)?.appointmentId ?? null;
  if (linkedAppointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: linkedAppointmentId },
      select: { scheduledAt: true },
    });
    return appt?.scheduledAt ?? null;
  }

  return null;
}

async function loadPostPaymentContext(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { kind: { in: CONSULTATION_KINDS } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!order || order.items.length === 0) return null;

  const primary = order.items[0]!;
  const slot = primary.timeSlotId
    ? await prisma.doctorTimeSlot.findUnique({
        where: { id: primary.timeSlotId },
        select: { startAt: true },
      })
    : null;
  let appointmentStart = slot?.startAt ?? null;
  if (!appointmentStart && primary.appointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: primary.appointmentId },
      select: { scheduledAt: true },
    });
    appointmentStart = appt?.scheduledAt ?? null;
  }

  const doctorContact = await resolveDoctorContact(primary.doctorId);

  const lang = detectAutomationLanguage({
    countryCode: order.countryCode,
    serviceName: primary.name,
  });
  const patientFullName = resolvePatientFullName(order.fullName, primary.patientFullName);
  const { firstName, lastName } = splitPatientName(patientFullName);
  const meetingLink = order.meetingUrl?.trim() ?? "";
  const doctorName = doctorContact
    ? formatDoctorDisplayName(doctorContact)
    : "Assigned doctor";

  const ctx: PostPaymentMessageContext = {
    patientName: patientFullName,
    patientFirstName: firstName,
    patientLastName: lastName,
    patientEmail: order.email,
    patientPhone: order.phone?.trim() ?? "",
    serviceName: prefixServiceName(primary.name, order.countryCode),
    doctorName,
    appointmentDate: appointmentStart
      ? formatDeadline(appointmentStart, primary.patientTimezone, lang)
      : pendingAppointmentDateLabel(lang),
    appointmentDateTime: appointmentStart
      ? formatDeadline(appointmentStart, primary.patientTimezone, lang)
      : pendingAppointmentDateLabel(lang),
    meetingLink,
    meetingLinkDisplay: meetingLink ? formatMeetingLinkDisplay(meetingLink) : "",
    orderNumber: formatOrderDisplayId({ id: order.id, orderNumber: order.orderNumber }),
    totalLabel: formatOrderTotal(order.totalCents, order.currencyCode),
  };

  const doctorEmail = doctorContact?.loginEmail ?? null;

  return {
    order,
    primary,
    doctorContact,
    doctorEmail,
    lang,
    ctx,
    consultStart: appointmentStart,
    phoneHints: {
      orderCountryCode: order.countryCode,
      patientAddressCountryCode: primary.patientAddressCountryCode,
    } satisfies PhoneNormalizeHints,
    portal: await resolveOrderPortalAccess(orderId),
  };
}

const WHATSAPP_CONTACT_FOOTER =
  "\n\nReply here or reach us out at globalhealth@myglobalhealth.online";

async function sendWhatsApp(
  automationKey: string,
  orderId: string,
  to: string | null | undefined,
  message: string,
  summary: string,
  phoneHints?: PhoneNormalizeHints,
  /** Pass `false` for patient sends when the booking lacks WhatsApp consent
   *  — the send is skipped (GDPR). Doctor sends omit this entirely. */
  patientConsent?: boolean,
) {
  if (patientConsent === false) {
    console.warn(`[automation] patient WhatsApp skipped — no consent (orderId=${orderId})`);
    await createAutomationRun({
      automationKey,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${summary} (no WhatsApp consent)`,
      executedAt: new Date(),
    });
    return;
  }
  if (!to?.trim()) {
    await createAutomationRun({
      automationKey,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${summary} (no phone)`,
      executedAt: new Date(),
    });
    return;
  }
  const run = await createAutomationRun({
    automationKey,
    orderId,
    channel: "whatsapp",
    recipient: to,
    summary,
    status: "RUNNING",
  });
  const result = await sendWhatsAppText({
    to,
    message: message + WHATSAPP_CONTACT_FOOTER,
    hints: phoneHints,
    patientConsent,
  });
  const jidMissing = result.message?.toLowerCase().includes("jid does not exist");
  if (!result.ok && !result.skipped) {
    await finishAutomationRun(run.id, {
      status: jidMissing ? "SKIPPED" : "FAILED",
      summary: jidMissing
        ? `${summary} (number not registered on WhatsApp — update doctor profile in admin)`
        : summary,
      error: formatWhatsAppSendError(result),
      recipient: result.to ?? to,
    });
    return;
  }
  await finishAutomationRun(run.id, {
    status: result.skipped ? "SKIPPED" : "SUCCESS",
    summary: result.skipped ? `${summary} (WhatsApp not configured)` : summary,
    recipient: result.to ?? to,
  });
}

async function sendPatientEmail(
  automationKey: string,
  orderId: string,
  to: string,
  lang: ReturnType<typeof detectAutomationLanguage>,
  ctx: PostPaymentMessageContext,
  summary: string,
  variant: PostPaymentEmailVariant,
  subject: string,
  portal?: PrePaymentEmailPortalAccess | null,
) {
  const run = await createAutomationRun({
    automationKey,
    orderId,
    channel: "email",
    recipient: to,
    summary,
    status: "RUNNING",
  });
  try {
    const logoSrc = await resolveEmailLogoUrl();
    await sendAutomationEmail(
      {
        to,
        subject,
        text: buildPostPaymentPatientEmailText(ctx, lang, variant, portal),
        html: buildPostPaymentPatientEmailHtml(ctx, lang, variant, logoSrc, portal),
      },
      { recordLabel: ctx.orderNumber },
    );
    await finishAutomationRun(run.id, { status: "SUCCESS", summary });
  } catch (err) {
    await finishAutomationRun(run.id, {
      status: "FAILED",
      summary,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function sendDoctorEmail(
  automationKey: string,
  orderId: string,
  to: string,
  lang: ReturnType<typeof detectAutomationLanguage>,
  ctx: PostPaymentMessageContext,
  summary: string,
  variant: "meeting_link" | "one_hour" | "session_start",
  subject: string,
) {
  const run = await createAutomationRun({
    automationKey,
    orderId,
    channel: "email",
    recipient: to,
    summary,
    status: "RUNNING",
  });
  try {
    await sendAutomationEmail(
      {
        to,
        subject,
        text: buildPostPaymentDoctorEmailText(ctx, lang, variant),
        html: buildPostPaymentDoctorEmailHtml(ctx, lang, variant),
      },
      { recordLabel: ctx.orderNumber },
    );
    await finishAutomationRun(run.id, { status: "SUCCESS", summary });
  } catch (err) {
    await finishAutomationRun(run.id, {
      status: "FAILED",
      summary,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Marks post-payment stage 1 — patient confirmation is sent at meeting-link stage only. */
export async function post_sendPaymentConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      paymentStatus: true,
      status: true,
      postPaymentStage: true,
      postPaymentFlowStartedAt: true,
    },
  });
  if (!order) return;
  if (order.paymentStatus !== "PAID" && order.status !== "PAID") return;
  if (order.postPaymentStage >= POST_PAYMENT_STAGE_PAID) return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      postPaymentStage: POST_PAYMENT_STAGE_PAID,
      postPaymentFlowStartedAt: order.postPaymentFlowStartedAt ?? new Date(),
    },
  });
}

/** Flow 2 — meeting link generated (patient + doctor WhatsApp and email). */
export async function post_sendMeetingLinkNotifications(orderId: string) {
  let loaded = await loadPostPaymentContext(orderId);
  if (!loaded) return;
  if (loaded.order.paymentStatus !== "PAID" && loaded.order.status !== "PAID") return;

  if (loaded.order.postPaymentStage < POST_PAYMENT_STAGE_PAID) {
    await post_sendPaymentConfirmation(orderId);
    loaded = await loadPostPaymentContext(orderId);
    if (!loaded) return;
  }

  if (loaded.order.postPaymentStage >= POST_PAYMENT_STAGE_MEETING_LINK) return;
  if (!loaded.ctx.meetingLink) return;

  // Atomic stage claim — prevents duplicate notifications when cron and direct
  // call (from ensureOrderPaidAutomations) fire simultaneously for website orders.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, postPaymentStage: POST_PAYMENT_STAGE_PAID },
    data: { postPaymentStage: POST_PAYMENT_STAGE_MEETING_LINK },
  });
  if (claimed.count === 0) return;

  const { order, primary, doctorContact, doctorEmail, lang, ctx, phoneHints, portal } = loaded;
  const baseKey = "post_payment_meeting_link";

  await sendWhatsApp(
    `${baseKey}_patient_whatsapp`,
    orderId,
    order.phone,
    appendPatientPortalWhatsApp(patientWhatsAppMeetingLink(ctx, lang), portal, lang),
    "Patient WhatsApp — meeting link",
    phoneHints,
    primary.patientWhatsappConsent,
  );

  await sendPatientEmail(
    `${baseKey}_patient_email`,
    orderId,
    order.email,
    lang,
    ctx,
    "Patient email — meeting link",
    "meeting_link",
    patientEmailSubjectConfirmed(ctx, lang),
    portal,
  );

  if (doctorContact?.whatsappNumber) {
    await sendWhatsApp(
      `${baseKey}_doctor_whatsapp`,
      orderId,
      doctorContact.whatsappNumber,
      doctorWhatsAppMeetingLink(ctx, lang),
      "Doctor WhatsApp — meeting link",
      doctorContact.whatsappHints,
    );
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_whatsapp`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: doctorContact?.whatsappRaw
        ? "Doctor WhatsApp — meeting link (invalid or placeholder number — set a real WhatsApp on doctor profile in admin)"
        : "Doctor WhatsApp — meeting link (set WhatsApp number on doctor profile in admin)",
      recipient: doctorContact?.whatsappRaw ?? undefined,
      executedAt: new Date(),
    });
  }

  if (doctorEmail) {
    await sendDoctorEmail(
      `${baseKey}_doctor_email`,
      orderId,
      doctorEmail,
      lang,
      ctx,
      "Doctor email — meeting link",
      "meeting_link",
      doctorEmailSubjectMeetingLink(lang),
    );
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_email`,
      orderId,
      channel: "email",
      status: "SKIPPED",
      summary:
        "Doctor email — meeting link (link a portal login email to this doctor in admin)",
      executedAt: new Date(),
    });
  }

  if (primary.doctorId) {
    const { notifyDoctor } = await import("../notifications/notify.service.js");
    await notifyDoctor(primary.doctorId, "APPOINTMENT_ASSIGNED", {
      snippet: `${ctx.patientName} · ${ctx.serviceName} · ${ctx.appointmentDateTime} · paid`,
    }).catch(() => undefined);
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_portal`,
      orderId,
      channel: "portal",
      status: "SUCCESS",
      summary: "Doctor portal notification — appointment confirmed (paid)",
      executedAt: new Date(),
    });
  }

}

/** Re-send meeting-link WhatsApp only (e.g. after fixing phone format). */
export async function post_resendMeetingLinkWhatsApp(orderId: string) {
  const loaded = await loadPostPaymentContext(orderId);
  if (!loaded) return;
  if (loaded.order.paymentStatus !== "PAID" && loaded.order.status !== "PAID") return;
  if (!loaded.ctx.meetingLink) return;

  const { order, primary, doctorContact, lang, ctx, phoneHints, portal } = loaded;
  const baseKey = "post_payment_meeting_link_resend";

  await sendWhatsApp(
    `${baseKey}_patient_whatsapp`,
    orderId,
    order.phone,
    appendPatientPortalWhatsApp(patientWhatsAppMeetingLink(ctx, lang), portal, lang),
    "Patient WhatsApp — meeting link (resend)",
    phoneHints,
    primary.patientWhatsappConsent,
  );

  if (doctorContact?.whatsappNumber) {
    await sendWhatsApp(
      `${baseKey}_doctor_whatsapp`,
      orderId,
      doctorContact.whatsappNumber,
      doctorWhatsAppMeetingLink(ctx, lang),
      "Doctor WhatsApp — meeting link (resend)",
      doctorContact.whatsappHints,
    );
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_whatsapp`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: doctorContact?.whatsappRaw
        ? "Doctor WhatsApp — meeting link resend (invalid or placeholder number — set a real WhatsApp on doctor profile in admin)"
        : "Doctor WhatsApp — meeting link resend (set WhatsApp number on doctor profile in admin)",
      recipient: doctorContact?.whatsappRaw ?? undefined,
      executedAt: new Date(),
    });
  }
}

/** Flow 3 — 1 hour before session. */
export async function post_sendOneHourReminder(orderId: string) {
  const loaded = await loadPostPaymentContext(orderId);
  if (!loaded) return;
  if (loaded.order.paymentStatus !== "PAID") return;
  if (loaded.order.postPaymentStage < POST_PAYMENT_STAGE_MEETING_LINK) return;
  if (loaded.order.postPaymentStage >= POST_PAYMENT_STAGE_ONE_HOUR) return;
  if (!loaded.ctx.meetingLink || !loaded.consultStart) return;

  const { order, primary, doctorContact, doctorEmail, lang, ctx, phoneHints, portal } = loaded;
  const baseKey = "post_payment_one_hour";

  await sendWhatsApp(
    `${baseKey}_patient_whatsapp`,
    orderId,
    order.phone,
    patientWhatsAppOneHourReminder(ctx, lang),
    "Patient WhatsApp — 1 hour reminder",
    phoneHints,
    primary.patientWhatsappConsent,
  );

  await sendPatientEmail(
    `${baseKey}_patient_email`,
    orderId,
    order.email,
    lang,
    ctx,
    "Patient email — 1 hour reminder",
    "one_hour",
    patientEmailSubjectOneHour(lang),
    portal,
  );

  if (doctorContact?.whatsappNumber) {
    await sendWhatsApp(
      `${baseKey}_doctor_whatsapp`,
      orderId,
      doctorContact.whatsappNumber,
      doctorWhatsAppOneHourReminder(ctx, lang),
      "Doctor WhatsApp — 1 hour reminder",
      doctorContact.whatsappHints,
    );
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_whatsapp`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: doctorContact?.whatsappRaw
        ? "Doctor WhatsApp — 1 hour reminder (invalid or placeholder number — set a real WhatsApp on doctor profile in admin)"
        : "Doctor WhatsApp — 1 hour reminder (set WhatsApp number on doctor profile in admin)",
      recipient: doctorContact?.whatsappRaw ?? undefined,
      executedAt: new Date(),
    });
  }

  if (doctorEmail) {
    await sendDoctorEmail(
      `${baseKey}_doctor_email`,
      orderId,
      doctorEmail,
      lang,
      ctx,
      "Doctor email — 1 hour reminder",
      "one_hour",
      doctorEmailSubjectOneHour(lang),
    );
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_email`,
      orderId,
      channel: "email",
      status: "SKIPPED",
      summary:
        "Doctor email — 1 hour reminder (link a portal login email to this doctor in admin)",
      executedAt: new Date(),
    });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { postPaymentStage: POST_PAYMENT_STAGE_ONE_HOUR },
  });
}

/** Flow 4 — 5 minutes before session (patient + doctor WhatsApp and email). */
export async function post_sendFiveMinuteReminder(orderId: string) {
  const loaded = await loadPostPaymentContext(orderId);
  if (!loaded) return;
  if (loaded.order.paymentStatus !== "PAID") return;
  if (loaded.order.postPaymentStage < POST_PAYMENT_STAGE_ONE_HOUR) return;
  if (loaded.order.postPaymentStage >= POST_PAYMENT_STAGE_SESSION_START) return;
  if (!loaded.ctx.meetingLink || !loaded.consultStart) return;

  const { order, primary, doctorContact, doctorEmail, lang, ctx, phoneHints, portal } = loaded;
  const baseKey = "post_payment_five_min";

  await sendWhatsApp(
    `${baseKey}_patient_whatsapp`,
    orderId,
    order.phone,
    patientWhatsAppSessionStart(ctx, lang),
    "Patient WhatsApp — 5 minute reminder",
    phoneHints,
    primary.patientWhatsappConsent,
  );

  await sendPatientEmail(
    `${baseKey}_patient_email`,
    orderId,
    order.email,
    lang,
    ctx,
    "Patient email — 5 minute reminder",
    "session_start",
    patientEmailSubjectSessionStart(lang),
    portal,
  );

  if (doctorContact?.whatsappNumber) {
    await sendWhatsApp(
      `${baseKey}_doctor_whatsapp`,
      orderId,
      doctorContact.whatsappNumber,
      doctorWhatsAppSessionStart(ctx, lang),
      "Doctor WhatsApp — 5 minute reminder",
      doctorContact.whatsappHints,
    );
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_whatsapp`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: doctorContact?.whatsappRaw
        ? "Doctor WhatsApp — 5 minute reminder (invalid or placeholder number — set a real WhatsApp on doctor profile in admin)"
        : "Doctor WhatsApp — 5 minute reminder (set WhatsApp number on doctor profile in admin)",
      recipient: doctorContact?.whatsappRaw ?? undefined,
      executedAt: new Date(),
    });
  }

  if (doctorEmail) {
    await sendDoctorEmail(
      `${baseKey}_doctor_email`,
      orderId,
      doctorEmail,
      lang,
      ctx,
      "Doctor email — 5 minute reminder",
      "session_start",
      doctorEmailSubjectSessionStart(lang),
    );
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_doctor_email`,
      orderId,
      channel: "email",
      status: "SKIPPED",
      summary:
        "Doctor email — 5 minute reminder (link a portal login email to this doctor in admin)",
      executedAt: new Date(),
    });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { postPaymentStage: POST_PAYMENT_STAGE_SESSION_START },
  });
}

/** Entry point after payment — runs Flow 1. */
export async function startPostPaymentFlow(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  const hasConsult =
    order.items.some((i) => CONSULTATION_KINDS.includes(i.kind)) ||
    order.appointmentIds.length > 0;
  if (!hasConsult) return;
  if (order.paymentStatus !== "PAID" && order.status !== "PAID") return;

  await post_sendPaymentConfirmation(orderId);
}

export async function runPostPaymentReminderCron() {
  const now = new Date();
  const oneHourWindowStart = new Date(now.getTime() + 55 * MS_MINUTE);
  const oneHourWindowEnd = new Date(now.getTime() + 65 * MS_MINUTE);
  const fiveMinWindowStart = new Date(now.getTime() + 0 * MS_MINUTE);
  const fiveMinWindowEnd = new Date(now.getTime() + 8 * MS_MINUTE);

  const paidOrders = await prisma.order.findMany({
    where: {
      paymentStatus: "PAID",
      postPaymentStage: { gte: POST_PAYMENT_STAGE_PAID, lt: POST_PAYMENT_STAGE_SESSION_START },
      items: { some: { kind: { in: CONSULTATION_KINDS } } },
    },
    select: { id: true, postPaymentStage: true, meetingUrl: true },
    take: 100,
    orderBy: { updatedAt: "asc" },
  });

  let meetingLinkSent = 0;
  let oneHourSent = 0;
  let fiveMinSent = 0;

  for (const row of paidOrders) {
    if (
      row.postPaymentStage === POST_PAYMENT_STAGE_PAID &&
      row.meetingUrl?.trim()
    ) {
      await post_sendMeetingLinkNotifications(row.id).catch(() => undefined);
      meetingLinkSent++;
      continue;
    }

    const consultStart = await resolveConsultationStartForOrder(row.id);
    if (!consultStart || !row.meetingUrl?.trim()) continue;

    if (
      row.postPaymentStage === POST_PAYMENT_STAGE_MEETING_LINK &&
      consultStart >= oneHourWindowStart &&
      consultStart <= oneHourWindowEnd
    ) {
      await post_sendOneHourReminder(row.id).catch(() => undefined);
      oneHourSent++;
      continue;
    }

    if (
      row.postPaymentStage === POST_PAYMENT_STAGE_ONE_HOUR &&
      consultStart >= fiveMinWindowStart &&
      consultStart <= fiveMinWindowEnd
    ) {
      await post_sendFiveMinuteReminder(row.id).catch(() => undefined);
      fiveMinSent++;
    }
  }

  return {
    candidates: paidOrders.length,
    meetingLinkSent,
    oneHourSent,
    fiveMinSent,
  };
}

/** Spec aliases for post-payment WhatsApp triggers. */
export const post_sendWhatsappPaymentConfirmation = post_sendPaymentConfirmation;
export const post_sendWhatsappNotificationMeetingLink = post_sendMeetingLinkNotifications;
export const post_sendWhatsappMeetingSessionBeginHour = post_sendOneHourReminder;
export const post_sendWhatsappSessionStart = post_sendFiveMinuteReminder;
export const post_sendSessionStart = post_sendFiveMinuteReminder;
