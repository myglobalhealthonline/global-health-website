import { CartItemKind, PrePaymentFlow } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { releaseSlotsToBaseGrid } from "../doctor-availability/doctor-availability.service.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { resolveEmailLogoUrl } from "../../lib/email/resolve-email-logo-url.js";
import { resolveOrderPaymentUrl } from "../orders/order-payment-url.service.js";
import { sendAutomationEmail } from "./send-automation-notification.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import { resolveDoctorContact } from "../../lib/whatsapp/resolve-doctor-contact.js";
import { formatDoctorForPatientNotification } from "../../lib/doctor-name.js";
import type { PhoneNormalizeHints } from "../../lib/whatsapp/normalize-phone.js";
import { formatOrderDisplayId } from "./automation-catalog.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import {
  buildPrePaymentEmailHtml,
  buildPrePaymentEmailText,
  formatOrderTotal,
  resolvePatientFullName,
  splitPatientName,
  type PrePaymentEmailPortalAccess,
  type PrePaymentEmailVariant,
} from "./pre-payment-email-template.js";
import {
  detectAutomationLanguage,
  formatDeadline,
  pendingAppointmentDateLabel,
  patientEmailSubject,
  patientWhatsAppInitial,
  appendPatientPortalWhatsApp,
  reminderMessage,
  doctorEmailSubjectBooking,
  doctorEmailSubjectCancelled,
  doctorWhatsAppBookingReceived,
  doctorWhatsAppCancelled,
  type PrePaymentMessageContext,
} from "./pre-payment-messages.js";
import {
  markOrderPortalTempPasswordSent,
  persistOrderPortalAccess,
  resolveOrderPortalAccess,
} from "./resolve-order-portal-access.service.js";

const MS_HOUR = 60 * 60 * 1000;
const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

/** Reminder thresholds (hours before consultation) for orders booked >48h out. */
export const PRE_PAYMENT_REMINDER_HOURS_OUTSIDE_48H = [72, 48, 24, 12, 6] as const;
/** Reminder thresholds for consultations within 48h of booking (includes 2h). */
export const PRE_PAYMENT_REMINDER_HOURS_WITHIN_48H = [24, 12, 6, 2] as const;

/** @deprecated Use prePaymentReminderHours(flow) */
export const PRE_PAYMENT_REMINDER_HOURS_BEFORE_CONSULT = PRE_PAYMENT_REMINDER_HOURS_OUTSIDE_48H;

/** Stage 1 = immediate checkout; last stage = cancel at payment deadline. */
export const PRE_PAYMENT_CANCEL_STAGE = 7;

export function prePaymentReminderHours(flow: PrePaymentFlow): readonly number[] {
  return flow === PrePaymentFlow.WITHIN_48H
    ? PRE_PAYMENT_REMINDER_HOURS_WITHIN_48H
    : PRE_PAYMENT_REMINDER_HOURS_OUTSIDE_48H;
}

export function prePaymentCancelStage(flow: PrePaymentFlow): number {
  return 1 + prePaymentReminderHours(flow).length + 1;
}

export function prePaymentLastReminderStage(flow: PrePaymentFlow): number {
  return prePaymentCancelStage(flow) - 1;
}

export function computePrePaymentPlan(input: {
  bookedAt: Date;
  consultationStartAt: Date | null;
}): { flow: PrePaymentFlow; paymentDueAt: Date } {
  const bookedAt = input.bookedAt;
  const consultAt = input.consultationStartAt;
  const hoursUntilConsult =
    consultAt != null
      ? (consultAt.getTime() - bookedAt.getTime()) / MS_HOUR
      : Number.POSITIVE_INFINITY;

  if (hoursUntilConsult <= 48) {
    return {
      flow: PrePaymentFlow.WITHIN_48H,
      paymentDueAt:
        consultAt != null
          ? new Date(consultAt.getTime() - 1 * MS_HOUR)
          : new Date(bookedAt.getTime() + 1 * MS_HOUR),
    };
  }

  return {
    flow: PrePaymentFlow.OUTSIDE_48H,
    paymentDueAt:
      consultAt != null
        ? new Date(consultAt.getTime() - 24 * MS_HOUR)
        : new Date(bookedAt.getTime() + 24 * MS_HOUR),
  };
}

function automationBaseKey(flow: PrePaymentFlow): string {
  return flow === PrePaymentFlow.WITHIN_48H ? "pre_payment_flow_a" : "pre_payment_flow_b";
}

function maxStage(flow: PrePaymentFlow): number {
  return prePaymentCancelStage(flow);
}

function stageThresholdHours(flow: PrePaymentFlow, stage: number): number | null {
  if (stage === 1) return null;
  const hours = prePaymentReminderHours(flow);
  const idx = stage - 2;
  if (idx >= 0 && idx < hours.length) {
    return hours[idx] ?? null;
  }
  return null;
}

function hoursUntil(date: Date, now: Date): number {
  return (date.getTime() - now.getTime()) / MS_HOUR;
}

export type StartPrePaymentFlowOptions = {
  /** Include patient portal sign-in details in the stage-1 email (manual bookings). */
  portal?: {
    setPasswordUrl: string;
    tempPassword: string | null;
  };
};

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

async function getConsultationStartForOrder(orderId: string): Promise<Date | null> {
  return resolveConsultationStartForOrder(orderId);
}

async function loadOrderContext(orderId: string, paymentUrl: string | null) {
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
  const doctor = primary.doctorId
    ? await prisma.doctor.findUnique({
        where: { id: primary.doctorId },
        select: { fullName: true, title: true, whatsappNumber: true },
      })
    : null;

  const lang = detectAutomationLanguage({
    countryCode: order.countryCode,
    serviceName: primary.name,
  });
  const deadline = order.paymentDueAt ?? new Date();
  const patientFullName = resolvePatientFullName(order.fullName, primary.patientFullName);
  const { firstName, lastName } = splitPatientName(patientFullName);
  const resolvedPaymentLink = await resolveOrderPaymentUrl(orderId, paymentUrl);
  const ctx: PrePaymentMessageContext = {
    patientName: patientFullName,
    patientFirstName: firstName,
    patientLastName: lastName,
    serviceName: primary.name,
    doctorName: doctor
      ? formatDoctorForPatientNotification(doctor.fullName, doctor.title)
      : "Assigned doctor",
    appointmentDate: appointmentStart
      ? formatDeadline(appointmentStart, primary.patientTimezone, lang)
      : pendingAppointmentDateLabel(lang),
    paymentLink: resolvedPaymentLink,
    deadline: formatDeadline(deadline, primary.patientTimezone, lang),
    orderNumber: formatOrderDisplayId({ id: order.id, orderNumber: order.orderNumber }),
    totalLabel: formatOrderTotal(order.totalCents, order.currencyCode),
  };

  return {
    order,
    primary,
    doctor,
    lang,
    ctx,
    phoneHints: {
      orderCountryCode: order.countryCode,
      patientAddressCountryCode: primary.patientAddressCountryCode,
    } satisfies PhoneNormalizeHints,
    portal: await resolveOrderPortalAccess(orderId),
  };
}

async function sendPatientEmail(
  automationKey: string,
  orderId: string,
  to: string,
  lang: ReturnType<typeof detectAutomationLanguage>,
  ctx: PrePaymentMessageContext,
  summary: string,
  variant: PrePaymentEmailVariant = "initial",
  subjectOverride?: string,
  portal?: PrePaymentEmailPortalAccess | null,
) {
  const subject = subjectOverride ?? patientEmailSubject(ctx, lang);
  const portalAccess =
    variant !== "cancelled" && portal
      ? {
          ...portal,
          signInUrl: portal.signInUrl || absoluteSiteUrl("/login"),
        }
      : null;
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
        text: buildPrePaymentEmailText(ctx, lang, variant, portalAccess),
        html: buildPrePaymentEmailHtml(ctx, lang, variant, logoSrc, portalAccess),
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

async function notifyDoctorOnBooking(
  orderId: string,
  doctorId: string | null | undefined,
  ctx: PrePaymentMessageContext,
  lang: ReturnType<typeof detectAutomationLanguage>,
) {
  if (!doctorId) return;

  const doctorContact = await resolveDoctorContact(doctorId);
  const baseKey = "pre_payment_doctor_booking";

  if (doctorContact?.whatsappNumber) {
    await sendWhatsApp(
      `${baseKey}_whatsapp`,
      orderId,
      doctorContact.whatsappNumber,
      doctorWhatsAppBookingReceived(ctx, lang),
      "Doctor WhatsApp — new booking (payment pending)",
      doctorContact.whatsappHints,
    );
  } else if (doctorContact?.whatsappRaw) {
    await createAutomationRun({
      automationKey: `${baseKey}_whatsapp`,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary:
        "Doctor WhatsApp — new booking (invalid or placeholder number — set a real WhatsApp on doctor profile in admin)",
      recipient: doctorContact.whatsappRaw,
      executedAt: new Date(),
    });
  }

  if (doctorContact?.loginEmail) {
    const run = await createAutomationRun({
      automationKey: `${baseKey}_email`,
      orderId,
      channel: "email",
      recipient: doctorContact.loginEmail,
      summary: "Doctor email — new booking (payment pending)",
      status: "RUNNING",
    });
    try {
      const body = doctorWhatsAppBookingReceived(ctx, lang);
      await sendAutomationEmail(
        {
          to: doctorContact.loginEmail,
          subject: doctorEmailSubjectBooking(lang),
          text: body,
          html: `<div style="font-family:Georgia,serif;line-height:1.6;white-space:pre-wrap;">${body.replace(/\n/g, "<br/>")}</div>`,
        },
        { recordLabel: ctx.orderNumber },
      );
      await finishAutomationRun(run.id, { status: "SUCCESS", summary: "Doctor email — new booking (payment pending)" });
    } catch (err) {
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary: "Doctor email — new booking (payment pending)",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    await createAutomationRun({
      automationKey: `${baseKey}_email`,
      orderId,
      channel: "email",
      status: "SKIPPED",
      summary: "Doctor email — new booking (no login email — link a portal login user to this doctor in admin)",
      executedAt: new Date(),
    });
  }

  const { notifyDoctor } = await import("../notifications/notify.service.js");
  await notifyDoctor(doctorId, "APPOINTMENT_ASSIGNED", {
    snippet: `${ctx.patientName} · ${ctx.serviceName} · ${ctx.appointmentDate} · payment pending`,
  }).catch(() => undefined);
  await createAutomationRun({
    automationKey: `${baseKey}_portal`,
    orderId,
    channel: "portal",
    status: "SUCCESS",
    summary: "Doctor portal notification — new booking (payment pending)",
    executedAt: new Date(),
  });
}

export async function startPrePaymentFlow(
  orderId: string,
  paymentUrl: string | null,
  opts?: StartPrePaymentFlowOptions,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  const consultItems = order.items.filter((i) => CONSULTATION_KINDS.includes(i.kind));
  if (consultItems.length === 0) return;
  if (order.paymentStatus === "PAID" || order.status === "PAID") return;

  const consultAt = await resolveConsultationStartForOrder(orderId);

  const plan = computePrePaymentPlan({
    bookedAt: order.createdAt,
    consultationStartAt: consultAt,
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentDueAt: plan.paymentDueAt,
      prePaymentFlow: plan.flow,
      prePaymentReminderStage: 0,
      prePaymentFlowStartedAt: new Date(),
    },
  });

  if (opts?.portal) {
    await persistOrderPortalAccess(orderId, opts.portal);
  }

  const loaded = await loadOrderContext(orderId, paymentUrl);
  if (!loaded) return;
  const { order: o, primary, lang, ctx, phoneHints, portal } = loaded;
  const baseKey = automationBaseKey(plan.flow);
  const stageKey = `${baseKey}_stage_1`;

  // For website self-service orders skip all stage-1 notifications (patient + doctor).
  // Manual bookings (portal options always provided) send reservation alerts to both.
  const isManualBooking = Boolean(opts?.portal);
  if (isManualBooking) {
    await notifyDoctorOnBooking(orderId, primary.doctorId, ctx, lang);
    await sendWhatsApp(
      stageKey,
      orderId,
      o.phone,
      appendPatientPortalWhatsApp(patientWhatsAppInitial(ctx, lang), portal, lang),
      "Patient WhatsApp — reservation",
      phoneHints,
      primary.patientWhatsappConsent,
    );
    await sendPatientEmail(
      stageKey,
      orderId,
      o.email,
      lang,
      ctx,
      "Patient email — payment required",
      "initial",
      undefined,
      portal,
    );
  }

  if (portal?.tempPassword) {
    await markOrderPortalTempPasswordSent(orderId);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { prePaymentReminderStage: 1 },
  });
}

async function executeReminderStage(
  orderId: string,
  flow: PrePaymentFlow,
  stage: number,
  paymentUrl: string | null,
) {
  const loaded = await loadOrderContext(orderId, paymentUrl);
  if (!loaded) return;
  const { order, primary, lang, ctx, phoneHints, portal } = loaded;
  const baseKey = automationBaseKey(flow);
  const stageKey = `${baseKey}_stage_${stage}`;
  const cancelStage = prePaymentCancelStage(flow);
  const isFinal = stage === cancelStage;

  if (isFinal) {
    const msg = reminderMessage(ctx, lang, "cancelled");
    await sendWhatsApp(stageKey, orderId, order.phone, msg.whatsapp, "Patient WhatsApp — reservation cancelled", phoneHints, primary.patientWhatsappConsent);
    await sendPatientEmail(
      stageKey,
      orderId,
      order.email,
      lang,
      ctx,
      "Patient email — reservation cancelled",
      "cancelled",
      msg.subject,
    );

    // Notify doctor that the reservation was cancelled
    if (primary.doctorId) {
      const doctorContact = await resolveDoctorContact(primary.doctorId);
      const cancelKey = `${stageKey}_doctor`;
      if (doctorContact?.whatsappNumber) {
        await sendWhatsApp(
          `${cancelKey}_whatsapp`,
          orderId,
          doctorContact.whatsappNumber,
          doctorWhatsAppCancelled(ctx, lang),
          "Doctor WhatsApp — reservation cancelled",
          doctorContact.whatsappHints,
        );
      }
      if (doctorContact?.loginEmail) {
        const run = await createAutomationRun({
          automationKey: `${cancelKey}_email`,
          orderId,
          channel: "email",
          recipient: doctorContact.loginEmail,
          summary: "Doctor email — reservation cancelled",
          status: "RUNNING",
        });
        try {
          const body = doctorWhatsAppCancelled(ctx, lang);
          await sendAutomationEmail(
            {
              to: doctorContact.loginEmail,
              subject: doctorEmailSubjectCancelled(lang),
              text: body,
              html: `<div style="font-family:Georgia,serif;line-height:1.6;white-space:pre-wrap;">${body.replace(/\n/g, "<br/>")}</div>`,
            },
            { recordLabel: ctx.orderNumber },
          );
          await finishAutomationRun(run.id, { status: "SUCCESS", summary: "Doctor email — reservation cancelled" });
        } catch (err) {
          await finishAutomationRun(run.id, {
            status: "FAILED",
            summary: "Doctor email — reservation cancelled",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    await cancelPrePaymentOrder(orderId);
    return;
  }

  const kind = stage === prePaymentLastReminderStage(flow) ? "final" : "mid";
  const emailVariant: PrePaymentEmailVariant = kind === "final" ? "final" : "reminder";
  const msg = reminderMessage(ctx, lang, kind);
  await sendWhatsApp(
    stageKey,
    orderId,
    order.phone,
    msg.whatsapp,
    `Patient WhatsApp — reminder ${stage}`,
    phoneHints,
    primary.patientWhatsappConsent,
  );
  await sendPatientEmail(
    stageKey,
    orderId,
    order.email,
    lang,
    ctx,
    `Patient email — reminder ${stage}`,
    emailVariant,
    msg.subject,
    portal,
  );
}

export async function cancelPrePaymentOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.paymentStatus === "PAID" || order.status === "PAID") return;

  const heldSlotIds = order.items
    .map((i) => i.timeSlotId)
    .filter((id): id is string => Boolean(id));

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", paymentStatus: "FAILED" },
  });
  if (heldSlotIds.length) {
    await releaseSlotsToBaseGrid(heldSlotIds);
  }
}

export async function stopPrePaymentFlowOnPaid(orderId: string) {
  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "PAID" } },
    data: {
      paymentDueAt: null,
      prePaymentFlow: null,
    },
  });
  await createAutomationRun({
    automationKey: "pre_payment_paid_stop",
    orderId,
    status: "SKIPPED",
    summary: "Pre-payment reminders stopped — order paid",
    executedAt: new Date(),
  });
  const { startPostPaymentFlow } = await import("./post-payment-flow.service.js");
  await startPostPaymentFlow(orderId).catch(() => undefined);
}

/** @deprecated Use startPostPaymentFlow — kept for callers that only need the paid hook. */
export async function notifyDoctorOnPaymentConfirmed(orderId: string) {
  const { startPostPaymentFlow } = await import("./post-payment-flow.service.js");
  await startPostPaymentFlow(orderId);
}

export function prePaymentMaxStage(flow: PrePaymentFlow): number {
  return maxStage(flow);
}

export function prePaymentStageThresholdHours(
  flow: PrePaymentFlow,
  stage: number,
): number | null {
  return stageThresholdHours(flow, stage);
}

export async function runPrePaymentReminderCron(opts?: {
  resolvePaymentUrl?: (orderId: string) => Promise<string | null>;
}) {
  const now = new Date();
  const orders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: { in: ["UNPAID", "PENDING"] },
      prePaymentFlow: { not: null },
      paymentDueAt: { not: null },
    },
    take: 100,
    orderBy: { paymentDueAt: "asc" },
  });

  let processed = 0;
  let sent = 0;

  for (const order of orders) {
    if (!order.prePaymentFlow || !order.paymentDueAt) continue;
    processed++;
    const flow = order.prePaymentFlow;
    const override = await opts?.resolvePaymentUrl?.(order.id);
    const paymentUrl = override?.trim() || (await resolveOrderPaymentUrl(order.id, null)) || null;

    const cancelStage = prePaymentCancelStage(flow);

    // Cancel as soon as the payment deadline passes (1h or 24h before consult).
    if (
      now.getTime() >= order.paymentDueAt.getTime() &&
      order.prePaymentReminderStage < cancelStage
    ) {
      await executeReminderStage(order.id, flow, cancelStage, paymentUrl);
      await prisma.order.update({
        where: { id: order.id },
        data: { prePaymentReminderStage: cancelStage },
      });
      sent++;
      continue;
    }

    const nextStage = order.prePaymentReminderStage + 1;
    if (nextStage >= cancelStage) continue;

    const consultAt = await getConsultationStartForOrder(order.id);
    if (!consultAt) continue;

    const threshold = stageThresholdHours(flow, nextStage);
    if (threshold == null) continue;

    const hoursLeft = hoursUntil(consultAt, now);
    if (hoursLeft > threshold) continue;

    await executeReminderStage(order.id, flow, nextStage, paymentUrl);
    await prisma.order.update({
      where: { id: order.id },
      data: { prePaymentReminderStage: nextStage },
    });
    sent++;
  }

  return { candidates: orders.length, processed, sent };
}

/** Re-send stage-1 pre-payment notifications (patient + doctor). Idempotent keys use `_resend`. */
export async function resendPrePaymentInitialNotifications(orderId: string) {
  const paymentUrl = await resolveOrderPaymentUrl(orderId, null);
  const loaded = await loadOrderContext(orderId, paymentUrl);
  if (!loaded) {
    throw new Error("Order not found or has no consultation items");
  }

  const { order: o, primary, lang, ctx, phoneHints, portal } = loaded;
  const flow = o.prePaymentFlow ?? PrePaymentFlow.WITHIN_48H;
  const baseKey = `${automationBaseKey(flow)}_stage_1_resend`;

  await notifyDoctorOnBooking(orderId, primary.doctorId, ctx, lang);
  await sendWhatsApp(
    `${baseKey}_patient_whatsapp`,
    orderId,
    o.phone,
    appendPatientPortalWhatsApp(patientWhatsAppInitial(ctx, lang), portal, lang),
    "Patient WhatsApp — reservation (resend)",
    phoneHints,
    primary.patientWhatsappConsent,
  );
  await sendPatientEmail(
    `${baseKey}_patient_email`,
    orderId,
    o.email,
    lang,
    ctx,
    "Patient email — payment required (resend)",
    "initial",
    undefined,
    portal,
  );
}
