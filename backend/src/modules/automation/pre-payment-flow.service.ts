import { CartItemKind, PrePaymentFlow } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { releaseSlotsToBaseGrid } from "../doctor-availability/doctor-availability.service.js";
import { cancelOrderAppointments } from "../appointments/appointments.service.js";
import { releaseOrderCreditReservations } from "../subscriptions/checkout-pricing.service.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { resolveEmailLogoUrl } from "../../lib/email/resolve-email-logo-url.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { resolveOrderPaymentUrl, orderPayShortLink } from "../orders/order-payment-url.service.js";
import { sendAutomationEmail } from "./send-automation-notification.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import { resolveDoctorContact } from "../../lib/whatsapp/resolve-doctor-contact.js";
import { resolveStaffTimeZone } from "./staff-timezone.js";
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
  type CancellationCreditNoteRef,
  type PrePaymentEmailPortalAccess,
  type PrePaymentEmailVariant,
} from "./pre-payment-email-template.js";
import {
  detectAutomationLanguage,
  formatDeadline,
  prefixServiceName,
  pendingAppointmentDateLabel,
  patientEmailSubject,
  patientWhatsAppInitial,
  appendPatientPortalWhatsApp,
  reminderMessage,
  doctorEmailSubjectBooking,
  doctorEmailSubjectCancelled,
  doctorWhatsAppBookingReceived,
  doctorWhatsAppCancelled,
  type AutomationLang,
  type PrePaymentMessageContext,
} from "./pre-payment-messages.js";
import { whatsappContactFooter } from "./whatsapp-contact-footer.js";
import { sendAdminBookingAlert } from "./admin-booking-alert.service.js";
import {
  markOrderPortalTempPasswordSent,
  persistOrderPortalAccess,
  resolveOrderPortalAccess,
} from "./resolve-order-portal-access.service.js";
import { generateCreditNoteForOrder } from "../invoices/generate-invoice.service.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";

const MS_HOUR = 60 * 60 * 1000;
const MS_MIN = 60 * 1000;
/** Books this close to the consultation → give a short 5-min pay window instead
 *  of the normal 1h, so an urgent last-minute booking isn't cancelled on the
 *  spot for "non-payment" before the patient can pay. */
const URGENT_BOOKING_HOURS = 2;
/**
 * Floor on every payment window, measured from the moment of booking.
 *
 * The 5-min urgent lead above is relative to the CONSULTATION, not to the
 * booking, so a slot booked less than 5 minutes before it starts produced a
 * `paymentDueAt` that was already in the past when the order row was written.
 * The cancel sweep (60s tick) then tore the reservation down while the patient
 * was still on the Stripe checkout page — ORD-000182: order created 21:40:04
 * with a deadline of 21:40:00, cancelled at 21:40:23, paid at 21:40:24. The
 * order flipped back to PAID but its slot was already released, so no
 * appointment was ever minted.
 *
 * A deadline may now land after the consultation has started. That is the
 * correct trade: an unpaid booking sitting a few minutes past its slot is
 * cheap, and charging a patient for a consultation we just cancelled is not.
 */
const MIN_PAY_WINDOW_MIN = 10;
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

  // Never hand back a deadline the patient cannot possibly meet — see
  // MIN_PAY_WINDOW_MIN. Applied to both flows: the 24h-before deadline of an
  // OUTSIDE_48H booking is equally in the past if the consultation is 49h out
  // and the clock has drifted, and a floor costs nothing when it doesn't bind.
  const floorAt = new Date(bookedAt.getTime() + MIN_PAY_WINDOW_MIN * MS_MIN);
  const notBefore = (due: Date): Date => (due.getTime() < floorAt.getTime() ? floorAt : due);

  if (hoursUntilConsult <= 48) {
    // Urgent last-minute booking (≤2h out): a 1h-before deadline would already
    // be in the past at booking time, cancelling the order immediately. Shrink
    // the lead to 5 minutes before the consultation so the patient can still pay.
    const leadMs = hoursUntilConsult <= URGENT_BOOKING_HOURS ? 5 * MS_MIN : 1 * MS_HOUR;
    return {
      flow: PrePaymentFlow.WITHIN_48H,
      paymentDueAt: notBefore(
        consultAt != null
          ? new Date(consultAt.getTime() - leadMs)
          : new Date(bookedAt.getTime() + 1 * MS_HOUR),
      ),
    };
  }

  return {
    flow: PrePaymentFlow.OUTSIDE_48H,
    paymentDueAt: notBefore(
      consultAt != null
        ? new Date(consultAt.getTime() - 24 * MS_HOUR)
        : new Date(bookedAt.getTime() + 24 * MS_HOUR),
    ),
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
  // Resolve to confirm the order is still payable, but hand the SHORT branded
  // link to messages (the raw Stripe URL is ~200 chars and looks broken in
  // WhatsApp). The short link re-resolves the live session at click time.
  const resolvedPaymentLink = await resolveOrderPaymentUrl(orderId, paymentUrl);
  const messagePaymentLink = resolvedPaymentLink ? orderPayShortLink(orderId) : "";
  const ctx: PrePaymentMessageContext = {
    patientName: patientFullName,
    patientFirstName: firstName,
    patientLastName: lastName,
    serviceName: prefixServiceName(primary.name, order.countryCode),
    doctorName: doctor
      ? formatDoctorForPatientNotification(doctor.fullName, doctor.title)
      : "Assigned doctor",
    appointmentDate: appointmentStart
      ? formatDeadline(appointmentStart, primary.patientTimezone, lang)
      : pendingAppointmentDateLabel(lang),
    paymentLink: messagePaymentLink,
    deadline: formatDeadline(deadline, primary.patientTimezone, lang),
    orderNumber: formatOrderDisplayId({ id: order.id, orderNumber: order.orderNumber }),
    totalLabel: formatOrderTotal(order.totalCents, order.currencyCode),
  };

  // Doctor + admin read the same booking on the BOOKED MARKET's clock, not the
  // patient's — see resolveStaffTimeZone.
  const staffTimeZone = await resolveStaffTimeZone({
    serviceId: primary.serviceId,
    countryCode: order.countryCode,
    doctorId: primary.doctorId,
  });
  const staffCtx: PrePaymentMessageContext = {
    ...ctx,
    appointmentDate: appointmentStart
      ? formatDeadline(appointmentStart, staffTimeZone, lang)
      : pendingAppointmentDateLabel(lang),
    deadline: formatDeadline(deadline, staffTimeZone, lang),
  };

  return {
    order,
    primary,
    doctor,
    lang,
    ctx,
    staffCtx,
    phoneHints: {
      orderCountryCode: order.countryCode,
      patientAddressCountryCode: primary.patientAddressCountryCode,
    } satisfies PhoneNormalizeHints,
    portal: await resolveOrderPortalAccess(orderId),
  };
}

/** A credit note to attach to (and name inside) a "cancelled" patient email. */
type CancelledEmailCreditNote = {
  invoiceId: string;
  ref: CancellationCreditNoteRef;
  pdfBuffer: Buffer;
};

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
  creditNote?: CancelledEmailCreditNote | null,
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
        text: buildPrePaymentEmailText(ctx, lang, variant, portalAccess, undefined, creditNote?.ref),
        html: buildPrePaymentEmailHtml(ctx, lang, variant, logoSrc, portalAccess, undefined, creditNote?.ref),
        ...(creditNote
          ? {
              attachments: [
                {
                  filename: `credit-note-${creditNote.ref.creditNoteNumber}.pdf`,
                  content: creditNote.pdfBuffer,
                  contentType: "application/pdf",
                },
              ],
            }
          : {}),
      },
      { recordLabel: ctx.orderNumber },
    );
    // The credit note has now reached the patient on this email — nothing else
    // sends it, so this is the only place its delivery gets stamped.
    if (creditNote) {
      await prisma.invoice
        .update({
          where: { id: creditNote.invoiceId },
          data: { emailSentAt: new Date(), emailSentTo: to },
        })
        .catch(() => undefined);
    }
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

async function sendWhatsApp(
  automationKey: string,
  orderId: string,
  to: string | null | undefined,
  message: string,
  summary: string,
  /** Market language — drives the localised contact footer. */
  lang: AutomationLang,
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
    message: message + whatsappContactFooter(lang),
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

/** `ctx` MUST be the staff-zone context — the doctor reads the booked market's clock. */
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
      lang,
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
          html: wrapHtml(
            doctorEmailSubjectBooking(lang),
            `<div style="white-space:pre-wrap;">${body.replace(/\n/g, "<br/>")}</div>`,
          ),
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
  const { order: o, primary, lang, ctx, staffCtx, phoneHints, portal } = loaded;
  const baseKey = automationBaseKey(plan.flow);
  const stageKey = `${baseKey}_stage_1`;

  // For website self-service orders skip all stage-1 notifications (patient + doctor).
  // Manual bookings (portal options always provided) send reservation alerts to both.
  const isManualBooking = Boolean(opts?.portal);
  if (isManualBooking) {
    await notifyDoctorOnBooking(orderId, primary.doctorId, staffCtx, lang);
    await sendWhatsApp(
      stageKey,
      orderId,
      o.phone,
      appendPatientPortalWhatsApp(patientWhatsAppInitial(ctx, lang), portal, lang),
      "Patient WhatsApp — reservation",
      lang,
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

  // Admin alert fires for EVERY booking, website self-service included — the
  // stage-1 patient/doctor skip above is a patient-facing rule, not a staff one.
  await sendAdminBookingAlert(orderId, baseKey, "booking_received", {
    orderNumber: staffCtx.orderNumber,
    appointmentDateTime: staffCtx.appointmentDate,
    doctorName: staffCtx.doctorName,
    serviceName: staffCtx.serviceName,
    patientName: staffCtx.patientName,
    patientWhatsappConsent: primary.patientWhatsappConsent,
  }).catch(() => undefined);

  if (portal?.tempPassword) {
    await markOrderPortalTempPasswordSent(orderId);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { prePaymentReminderStage: 1 },
  });
}

/**
 * Issue the credit note that voids an unpaid invoice when the booking is
 * cancelled for non-payment, and return it ready to attach to the cancellation
 * email. Nothing is refunded — no money was ever taken.
 *
 * Returns null (and the email goes out unchanged) whenever there is nothing to
 * send: the order carries no invoice to credit (every direct-web order — only
 * manual/AI bookings are invoiced before payment), Portugal, a prefixless
 * country, or a failed PDF render. A render failure must not make the email
 * claim an attachment it doesn't have; the row still exists for an admin resend.
 */
async function resolveCancellationCreditNote(
  orderId: string,
): Promise<CancelledEmailCreditNote | null> {
  const cn = await generateCreditNoteForOrder(orderId, undefined, {
    reason: "CANCELLATION",
    deliver: "caller",
  });
  if (!cn?.pdfBuffer || !cn.creditedInvoiceNumber) return null;
  return {
    invoiceId: cn.invoiceId,
    pdfBuffer: cn.pdfBuffer,
    ref: { creditNoteNumber: cn.invoiceNumber, invoiceNumber: cn.creditedInvoiceNumber },
  };
}

/**
 * Send the "reservation cancelled — non-payment" notifications (patient
 * WhatsApp + email, doctor WhatsApp + email). Extracted so EVERY unpaid-cancel
 * path fires the same messages the deadline sweep does — the pre-payment cron
 * cancel AND the Stripe `checkout.session.expired` webhook. Idempotent: the
 * automation-run keys are stable, and it's safe to call whether the order is
 * still PENDING or already flipped to CANCELLED. `stageKeyOverride` lets the
 * sweep reuse its stage-N key; other callers pass a path-specific key.
 *
 * The patient email doubles as credit-note delivery when the order was invoiced
 * before payment — one message, not two.
 */
export async function sendPrePaymentCancelledNotifications(
  orderId: string,
  stageKeyOverride?: string,
): Promise<void> {
  const loaded = await loadOrderContext(orderId, null);
  if (!loaded) return;
  const { order, primary, lang, ctx, staffCtx, phoneHints } = loaded;
  const flow = order.prePaymentFlow ?? PrePaymentFlow.WITHIN_48H;
  const baseKey = automationBaseKey(flow);
  const stageKey = stageKeyOverride ?? `${baseKey}_cancelled`;

  // Never block the cancellation notifications on invoicing trouble — the
  // patient must be told their reservation is gone either way.
  const creditNote = await resolveCancellationCreditNote(orderId).catch(() => null);

  const msg = reminderMessage(ctx, lang, "cancelled");
  await sendWhatsApp(stageKey, orderId, order.phone, msg.whatsapp, "Patient WhatsApp — reservation cancelled", lang, phoneHints, primary.patientWhatsappConsent);
  await sendPatientEmail(
    stageKey,
    orderId,
    order.email,
    lang,
    ctx,
    creditNote
      ? `Patient email — reservation cancelled (credit note ${creditNote.ref.creditNoteNumber})`
      : "Patient email — reservation cancelled",
    "cancelled",
    msg.subject,
    null,
    creditNote,
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
        doctorWhatsAppCancelled(staffCtx, lang),
        "Doctor WhatsApp — reservation cancelled",
        lang,
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
        const body = doctorWhatsAppCancelled(staffCtx, lang);
        await sendAutomationEmail(
          {
            to: doctorContact.loginEmail,
            subject: doctorEmailSubjectCancelled(lang),
            text: body,
            html: wrapHtml(
              doctorEmailSubjectCancelled(lang),
              `<div style="white-space:pre-wrap;">${body.replace(/\n/g, "<br/>")}</div>`,
            ),
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
  // Reminder stages only — the cancel stage is owned by runPrePaymentCancelSweep.
  const kind = stage === prePaymentLastReminderStage(flow) ? "final" : "mid";
  const emailVariant: PrePaymentEmailVariant = kind === "final" ? "final" : "reminder";
  const msg = reminderMessage(ctx, lang, kind);
  await sendWhatsApp(
    stageKey,
    orderId,
    order.phone,
    msg.whatsapp,
    `Patient WhatsApp — reminder ${stage}`,
    lang,
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

/**
 * Ask Stripe directly whether this order's checkout session has been paid.
 *
 * Our own `paymentStatus` column is only as fresh as the last webhook we
 * received, and the gap between "card charged at Stripe" and "webhook lands
 * here" is seconds — long enough for the cancel sweep to tear down a booking
 * the patient has already paid for (ORD-000182). Stripe is the authority, so
 * consult it before destroying anything.
 *
 *   "paid"         — do not cancel under any circumstance
 *   "not-paid"     — safe to cancel
 *   "unverifiable" — we could not reach Stripe; treated as "do not cancel",
 *                    because a slot held too long is recoverable and a patient
 *                    charged for a cancelled consultation is not.
 */
async function stripePaymentVerdict(order: {
  countryCode: string;
  stripeSessionId: string | null;
}): Promise<"paid" | "not-paid" | "unverifiable"> {
  // No session was ever created (e.g. insurance orders awaiting verification),
  // so there is no payment in flight to race with.
  if (!order.stripeSessionId) return "not-paid";
  if (!isStripeConfigured(order.countryCode)) return "not-paid";
  try {
    const stripe = getStripeClient(order.countryCode);
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    // `status: "complete"` covers a €0/credit-covered checkout, which completes
    // without ever setting payment_status to "paid".
    return session.payment_status === "paid" || session.status === "complete"
      ? "paid"
      : "not-paid";
  } catch {
    return "unverifiable";
  }
}

/**
 * Cancel an unpaid pre-payment order. The status flip is a single conditional
 * update, so exactly one caller can win it — a sweep racing another sweep (or
 * racing the Stripe session-expiry webhook) sees `false` and skips the
 * cancelled notifications rather than double-sending them.
 *
 * Returns true only when THIS call performed the cancellation.
 *
 * Tears down the same three things the Stripe session-expiry path does
 * (payments.route.ts): the held slots, the appointments, and any reserved plan
 * credits. That path cannot be relied on as a backstop here — it only acts on
 * orders still PENDING, so once this function flips the status it is skipped.
 *
 * Because that teardown is destructive and effectively irreversible (the held
 * slot is deleted and folded back into the base grid under a NEW id, so the
 * paid-order path can no longer find it), the local `paymentStatus` check below
 * is backed by a live Stripe lookup — see stripePaymentVerdict.
 */
export async function cancelPrePaymentOrder(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.paymentStatus === "PAID" || order.status === "PAID") return false;

  const verdict = await stripePaymentVerdict(order);
  if (verdict === "paid") {
    // The money is already at Stripe; only the webhook is late. Pull the payment
    // in now rather than cancelling a consultation the patient has bought.
    // Dynamic import — complete-order-payment.service imports this module.
    await import("../orders/complete-order-payment.service.js")
      .then((m) => m.syncOrderPaymentFromStripe(orderId))
      .catch(() => undefined);
    await createAutomationRun({
      automationKey: "pre_payment_cancel_skipped_paid_at_stripe",
      orderId,
      status: "SKIPPED",
      summary:
        "Deadline passed but Stripe reports the session paid — cancellation aborted, payment synced instead.",
      executedAt: new Date(),
    });
    return false;
  }
  if (verdict === "unverifiable") {
    await emitOpsAlert({
      severity: "warning",
      title: "Pre-payment cancel skipped — Stripe unreachable",
      detail:
        "Could not confirm the checkout session is unpaid, so the reservation was left intact. The sweep retries on its next tick.",
      context: { orderId, stripeSessionId: order.stripeSessionId },
    });
    return false;
  }

  const heldSlotIds = order.items
    .map((i) => i.timeSlotId)
    .filter((id): id is string => Boolean(id));

  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: { not: "CANCELLED" }, paymentStatus: { not: "PAID" } },
    data: { status: "CANCELLED", paymentStatus: "FAILED" },
  });
  if (claimed.count === 0) return false;

  if (heldSlotIds.length) {
    await releaseSlotsToBaseGrid(heldSlotIds);
  }

  // Manual bookings mint the Appointment up front, before payment
  // (manual-booking.service.ts), so a deadline cancel that skipped this would
  // leave a REQUEST_RECEIVED row sitting on the admin/doctor calendars while
  // releaseSlotsToBaseGrid above puts its slot back on sale — a ghost booking
  // over a slot another patient can now claim.
  await cancelOrderAppointments(orderId).catch(() => undefined);
  // Hand back plan credits reserved at checkout. sweepExpiredReservations would
  // eventually catch these anyway (they carry a 15-min reservedUntil), but only
  // after the TTL — release them now rather than leaving the patient short of a
  // credit for a booking that no longer exists.
  await releaseOrderCreditReservations(orderId).catch(() => undefined);

  return true;
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

/**
 * Deadline enforcement, split out of `runPrePaymentReminderCron` so it can tick
 * on its own short interval. The reminder cron ticks every 15 min and its body
 * can run for minutes (WhatsApp sends are globally serialized behind a 6s gap
 * plus retry backoffs in wasender.ts), so an order sharing that tick was
 * cancelled anywhere from 0 to ~15 min past `paymentDueAt`. That is worst for
 * urgent bookings, which get a 5-minute pay window (`computePrePaymentPlan`) —
 * a 15-min sweep could overshoot it 3x.
 *
 * Runs in two passes ON PURPOSE. Every due order is cancelled first (DB writes
 * only, milliseconds each), and the notifications are sent afterwards. Cancel
 * and notify interleaved per-order would rebuild the same bug in miniature: the
 * cancelled pair costs seconds of serialized WhatsApp per order, so the last
 * order in a batch of 20 would sit unenforced for minutes waiting its turn.
 * Cancelling before notifying also matches the Stripe session-expiry path in
 * payments.route.ts.
 */
export async function runPrePaymentCancelSweep() {
  const now = new Date();
  const due = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: { in: ["UNPAID", "PENDING"] },
      prePaymentFlow: { not: null },
      paymentDueAt: { not: null, lte: now },
    },
    take: 100,
    orderBy: { paymentDueAt: "asc" },
  });

  // Pass 1 — enforce every deadline. No sends in this loop.
  const claimed: { orderId: string; stageKey: string }[] = [];
  for (const order of due) {
    if (!order.prePaymentFlow) continue;
    const flow = order.prePaymentFlow;
    const cancelStage = prePaymentCancelStage(flow);
    if (order.prePaymentReminderStage >= cancelStage) continue;

    // One order failing must not hold up the rest of the batch — they are all
    // due NOW, so a single throw would re-create the drift this sweep removes.
    try {
      if (!(await cancelPrePaymentOrder(order.id))) continue;
      await prisma.order.update({
        where: { id: order.id },
        data: { prePaymentReminderStage: cancelStage },
      });
      claimed.push({
        orderId: order.id,
        stageKey: `${automationBaseKey(flow)}_stage_${cancelStage}`,
      });
    } catch {
      // Swallowed deliberately: an order left PENDING here is simply retried by
      // the next tick, 60s later.
    }
  }

  // Pass 2 — tell the patient and doctor. Slow (serialized WhatsApp), but every
  // deadline above is already enforced, so nothing time-critical waits on this.
  for (const { orderId, stageKey } of claimed) {
    try {
      await sendPrePaymentCancelledNotifications(orderId, stageKey);
    } catch {
      // The cancellation is already committed and won't be retried — per-channel
      // failures are recorded as FAILED AutomationRun rows by the senders.
    }
  }

  return { candidates: due.length, cancelled: claimed.length };
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
      // Past the deadline → runPrePaymentCancelSweep owns the order. Excluding
      // them here also means a slow reminder tick can never send a "pay now"
      // nudge to an order that is already being cancelled.
      paymentDueAt: { not: null, gt: now },
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

  const { order: o, primary, lang, ctx, staffCtx, phoneHints, portal } = loaded;
  const flow = o.prePaymentFlow ?? PrePaymentFlow.WITHIN_48H;
  const baseKey = `${automationBaseKey(flow)}_stage_1_resend`;

  await notifyDoctorOnBooking(orderId, primary.doctorId, staffCtx, lang);
  await sendWhatsApp(
    `${baseKey}_patient_whatsapp`,
    orderId,
    o.phone,
    appendPatientPortalWhatsApp(patientWhatsAppInitial(ctx, lang), portal, lang),
    "Patient WhatsApp — reservation (resend)",
    lang,
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
