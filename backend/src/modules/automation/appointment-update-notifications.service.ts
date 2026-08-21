import { CartItemKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  resolveNotificationLang,
  type NotificationLang,
} from "./notification-language.js";
import { resolveEmailLogoUrl } from "../../lib/email/resolve-email-logo-url.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import type { PhoneNormalizeHints } from "../../lib/whatsapp/normalize-phone.js";
import {
  formatDoctorDisplayName,
  resolveDoctorContact,
} from "../../lib/whatsapp/resolve-doctor-contact.js";
import { formatOrderDisplayId } from "./automation-catalog.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import {
  pendingAppointmentDateLabel,
} from "./pre-payment-messages.js";
import { formatOrderTotal, resolvePatientFullName, splitPatientName } from "./pre-payment-email-template.js";
import { sendAutomationEmail } from "./send-automation-notification.js";
import {
  buildPostPaymentDoctorEmailHtml,
  buildPostPaymentDoctorEmailText,
  buildPostPaymentPatientEmailHtml,
  buildPostPaymentPatientEmailText,
} from "./post-payment-email-template.js";
import {
  doctorEmailSubjectAppointmentReassigned,
  doctorEmailSubjectAppointmentUpdated,
  doctorWhatsAppAppointmentReassigned,
  doctorWhatsAppAppointmentUpdated,
  formatDeadline,
  formatMeetingLinkDisplay,
  patientEmailSubjectAppointmentUpdated,
  patientWhatsAppAppointmentUpdated,
  type PostPaymentMessageContext,
} from "./post-payment-messages.js";
import { sendAdminBookingAlert } from "./admin-booking-alert.service.js";
import { resolveStaffTimeZone } from "./staff-timezone.js";

const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

export type AppointmentUpdateNotifyInput = {
  orderId: string;
  appointmentId: string;
  changeReason: string;
  previousDoctorId: string | null;
  newDoctorId: string | null;
  meetingUrl: string | null;
};

async function loadUpdateContext(input: AppointmentUpdateNotifyInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: {
        where: { kind: { in: CONSULTATION_KINDS }, appointmentId: input.appointmentId },
        orderBy: { id: "asc" },
        take: 1,
      },
    },
  });
  if (!order || order.items.length === 0) return null;

  const primary = order.items[0]!;
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { scheduledAt: true, doctorId: true, serviceId: true, countryCode: true },
  });
  if (!appointment) return null;

  const doctorContact = await resolveDoctorContact(appointment.doctorId);
  const lang = resolveNotificationLang({
    notificationLocale: order.notificationLocale,
    countryCode: order.countryCode,
    serviceName: primary.name,
  });
  const patientFullName = resolvePatientFullName(order.fullName, primary.patientFullName);
  const { firstName, lastName } = splitPatientName(patientFullName);
  const meetingLink = (input.meetingUrl ?? order.meetingUrl ?? "").trim();
  const doctorName = doctorContact
    ? formatDoctorDisplayName(doctorContact)
    : "Assigned doctor";
  const appointmentStart = appointment.scheduledAt;

  const ctx: PostPaymentMessageContext = {
    patientName: patientFullName,
    patientFirstName: firstName,
    patientLastName: lastName,
    patientEmail: order.email,
    patientPhone: order.phone?.trim() ?? "",
    serviceName: primary.name,
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
    changeReason: input.changeReason.trim(),
  };

  // Doctor + admin read the same booking on the BOOKED MARKET's clock, not the
  // patient's — see resolveStaffTimeZone.
  const staffTimeZone = await resolveStaffTimeZone({
    serviceId: primary.serviceId ?? appointment.serviceId,
    countryCode: appointment.countryCode || order.countryCode,
    doctorId: appointment.doctorId,
  });
  const staffAppointmentLabel = appointmentStart
    ? formatDeadline(appointmentStart, staffTimeZone, lang)
    : pendingAppointmentDateLabel(lang);
  const staffCtx: PostPaymentMessageContext = {
    ...ctx,
    appointmentDate: staffAppointmentLabel,
    appointmentDateTime: staffAppointmentLabel,
  };

  return {
    order,
    primary,
    lang,
    ctx,
    staffCtx,
    doctorContact,
    phoneHints: {
      orderCountryCode: order.countryCode,
      patientAddressCountryCode: primary.patientAddressCountryCode,
    } satisfies PhoneNormalizeHints,
  };
}

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
  const result = await sendWhatsAppText({ to, message, hints: phoneHints, patientConsent });
  const jidMissing = result.message?.toLowerCase().includes("jid does not exist");
  if (!result.ok && !result.skipped) {
    await finishAutomationRun(run.id, {
      status: jidMissing ? "SKIPPED" : "FAILED",
      summary: jidMissing
        ? `${summary} (number not registered on WhatsApp)`
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
  orderId: string,
  to: string,
  lang: NotificationLang,
  ctx: PostPaymentMessageContext,
) {
  const automationKey = "appointment_update_patient_email";
  const summary = "Patient email — appointment updated";
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
        subject: patientEmailSubjectAppointmentUpdated(ctx, lang),
        text: buildPostPaymentPatientEmailText(ctx, lang, "appointment_updated"),
        html: buildPostPaymentPatientEmailHtml(ctx, lang, "appointment_updated", logoSrc),
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
  }
}

async function sendDoctorEmail(
  automationKey: string,
  orderId: string,
  to: string,
  lang: NotificationLang,
  ctx: PostPaymentMessageContext,
  summary: string,
  subject: string,
  variant: "appointment_updated" | "appointment_reassigned",
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
  }
}

async function notifyDoctorPortal(
  orderId: string,
  appointmentId: string,
  doctorId: string,
  ctx: PostPaymentMessageContext,
  reassigned: boolean,
) {
  const { notifyDoctor } = await import("../notifications/notify.service.js");
  await notifyDoctor(doctorId, "APPOINTMENT_ASSIGNED", {
    appointmentId,
    snippet: reassigned
      ? `${ctx.patientName} · reassigned away`
      : `${ctx.patientName} · ${ctx.serviceName} · updated`,
  }).catch(() => undefined);
  await createAutomationRun({
    automationKey: reassigned
      ? "appointment_update_doctor_portal_previous"
      : "appointment_update_doctor_portal",
    orderId,
    channel: "portal",
    status: "SUCCESS",
    summary: reassigned
      ? "Previous doctor portal — appointment reassigned"
      : "Doctor portal — appointment updated",
    executedAt: new Date(),
  });
}

/** `ctx` MUST be the staff-zone context — the doctor reads the booked market's clock. */
async function notifyDoctorUpdated(
  orderId: string,
  appointmentId: string,
  doctorId: string,
  lang: NotificationLang,
  ctx: PostPaymentMessageContext,
  phoneHints: PhoneNormalizeHints,
  keySuffix: "" | "_previous",
  variant: "appointment_updated" | "appointment_reassigned",
) {
  const contact = await resolveDoctorContact(doctorId);
  const doctorCtx: PostPaymentMessageContext = {
    ...ctx,
    doctorName: contact ? formatDoctorDisplayName(contact) : ctx.doctorName,
  };
  const whatsappMessage =
    variant === "appointment_reassigned"
      ? doctorWhatsAppAppointmentReassigned(doctorCtx, lang)
      : doctorWhatsAppAppointmentUpdated(doctorCtx, lang);
  const whatsappSummary =
    variant === "appointment_reassigned"
      ? "Previous doctor WhatsApp — appointment reassigned"
      : "Doctor WhatsApp — appointment updated";

  if (contact?.whatsappNumber) {
    await sendWhatsApp(
      `appointment_update_doctor_whatsapp${keySuffix}`,
      orderId,
      contact.whatsappNumber,
      whatsappMessage,
      whatsappSummary,
      contact.whatsappHints ?? phoneHints,
    );
  } else if (contact?.whatsappRaw) {
    await createAutomationRun({
      automationKey: `appointment_update_doctor_whatsapp${keySuffix}`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${whatsappSummary} (invalid or placeholder number)`,
      recipient: contact.whatsappRaw,
      executedAt: new Date(),
    });
  } else {
    await createAutomationRun({
      automationKey: `appointment_update_doctor_whatsapp${keySuffix}`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${whatsappSummary} (no phone)`,
      executedAt: new Date(),
    });
  }

  if (contact?.loginEmail) {
    await sendDoctorEmail(
      `appointment_update_doctor_email${keySuffix}`,
      orderId,
      contact.loginEmail,
      lang,
      doctorCtx,
      variant === "appointment_reassigned"
        ? "Previous doctor email — appointment reassigned"
        : "Doctor email — appointment updated",
      variant === "appointment_reassigned"
        ? doctorEmailSubjectAppointmentReassigned(lang)
        : doctorEmailSubjectAppointmentUpdated(lang),
      variant,
    );
  } else {
    await createAutomationRun({
      automationKey: `appointment_update_doctor_email${keySuffix}`,
      orderId,
      channel: "email",
      status: "SKIPPED",
      summary:
        variant === "appointment_reassigned"
          ? "Previous doctor email — appointment reassigned (no login email)"
          : "Doctor email — appointment updated (no login email)",
      executedAt: new Date(),
    });
  }

  if (variant === "appointment_updated") {
    await notifyDoctorPortal(orderId, appointmentId, doctorId, doctorCtx, false);
  } else {
    await notifyDoctorPortal(orderId, appointmentId, doctorId, doctorCtx, true);
  }
}

/** Notify patient + doctor(s) after an admin appointment update. */
export async function sendAppointmentUpdateNotifications(
  input: AppointmentUpdateNotifyInput,
): Promise<{ sent: boolean }> {
  const loaded = await loadUpdateContext(input);
  if (!loaded) return { sent: false };

  const { order, primary, lang, ctx, staffCtx, phoneHints } = loaded;
  const patientPhone = order.phone?.trim() || ctx.patientPhone;

  if (order.email?.trim()) {
    await sendPatientEmail(order.id, order.email.trim(), lang, ctx);
  } else {
    await createAutomationRun({
      automationKey: "appointment_update_patient_email",
      orderId: order.id,
      channel: "email",
      status: "SKIPPED",
      summary: "Patient email — appointment updated (no email)",
      executedAt: new Date(),
    });
  }

  if (patientPhone) {
    await sendWhatsApp(
      "appointment_update_patient_whatsapp",
      order.id,
      patientPhone,
      patientWhatsAppAppointmentUpdated(ctx, lang),
      "Patient WhatsApp — appointment updated",
      phoneHints,
      primary.patientWhatsappConsent,
    );
  } else {
    await createAutomationRun({
      automationKey: "appointment_update_patient_whatsapp",
      orderId: order.id,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: "Patient WhatsApp — appointment updated (no phone)",
      executedAt: new Date(),
    });
  }

  const previousDoctorId = input.previousDoctorId;
  const newDoctorId = input.newDoctorId;
  const doctorChanged =
    input.previousDoctorId !== input.newDoctorId &&
    (input.previousDoctorId !== null || input.newDoctorId !== null);

  if (newDoctorId && doctorChanged) {
    await notifyDoctorUpdated(
      order.id,
      input.appointmentId,
      newDoctorId,
      lang,
      staffCtx,
      phoneHints,
      "",
      "appointment_updated",
    );
  } else if (newDoctorId && !doctorChanged) {
    // Time-only update — still notify the assigned doctor.
    await notifyDoctorUpdated(
      order.id,
      input.appointmentId,
      newDoctorId,
      lang,
      staffCtx,
      phoneHints,
      "",
      "appointment_updated",
    );
  }

  if (
    previousDoctorId &&
    doctorChanged &&
    previousDoctorId !== newDoctorId
  ) {
    await notifyDoctorUpdated(
      order.id,
      input.appointmentId,
      previousDoctorId,
      lang,
      staffCtx,
      phoneHints,
      "_previous",
      "appointment_reassigned",
    );
  }

  await sendAdminBookingAlert(order.id, "appointment_update", "appointment_updated", {
    orderNumber: staffCtx.orderNumber,
    appointmentDateTime: staffCtx.appointmentDateTime,
    doctorName: staffCtx.doctorName,
    serviceName: staffCtx.serviceName,
    patientName: staffCtx.patientName,
    patientWhatsappConsent: primary.patientWhatsappConsent,
  }).catch(() => undefined);

  return { sent: true };
}
