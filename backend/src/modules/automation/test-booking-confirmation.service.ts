import { prisma } from "../../db/prisma.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { formatWhatsAppSendError, sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { escapeHtml } from "./admin-alert-delivery.js";
import type { Attendance } from "./attendance-line.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import { resolveNotificationLang } from "./notification-language.js";
import { formatDeadline } from "./pre-payment-messages.js";
import { sendAutomationEmail } from "./send-automation-notification.js";
import {
  patientEmailSubjectTestBookingConfirmation,
  patientWhatsAppTestBookingConfirmation,
  type TestBookingConfirmationContext,
} from "./test-booking-confirmation-messages.js";

/**
 * Send a test-centre booking confirmation to the patient, on an admin's say-so.
 *
 * The booking is replicated by hand into the laboratory's own system, so this
 * is the moment an admin can say "it is really booked" — and, when the lab gave
 * one, hand over its reference. Distinct from the automatic post-payment
 * confirmation (`post_sendVenueNotifications`), which fires the instant the
 * money lands and cannot know any of that.
 *
 * Sends whether or not a reference exists: plenty of providers give no code,
 * and a confirmation naming the date, the centre and the address is the point
 * of the message.
 *
 * Email always (transactional correspondence to the address that booked);
 * WhatsApp gated on the order's consent. Re-sendable — details get corrected
 * and sends fail — so each attempt is its own AutomationRun and
 * `Appointment.labConfirmationSentAt` carries the last success.
 */

export type TestBookingConfirmationResult = {
  ok: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  /** Why a leg did not go out. For the admin, never for the patient. */
  notes: string[];
};

function confirmationHtml(ctx: TestBookingConfirmationContext, intro: string): string {
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 2px;color:#6D6D6D;width:40%;">${escapeHtml(label)}</td>
      <td style="padding:8px 2px;font-weight:600;color:#1D4B36;">${escapeHtml(value)}</td>
    </tr>`;
  const rows = [row("Test", ctx.examName)];
  if (ctx.attendance.kind === "VENUE") {
    rows.push(row("Test centre", ctx.attendance.venueName));
    rows.push(row("Address", ctx.attendance.display));
  }
  rows.push(row("Date & time", ctx.appointmentDateTime));
  if (ctx.labReference?.trim()) rows.push(row("Booking reference", ctx.labReference.trim()));
  return wrapHtml(
    "Your test appointment is confirmed",
    `<p style="font-size:14px;color:#1D1D1D;">${escapeHtml(intro)}</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${rows.join("\n      ")}
    </table>`,
  );
}

export async function sendTestBookingConfirmationToPatient(
  appointmentId: string,
): Promise<TestBookingConfirmationResult> {
  const notes: string[] = [];
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      scheduledAt: true,
      consultationType: true,
      locationAddress: true,
      patientTimezone: true,
      notificationLocale: true,
      labReference: true,
      testCenterLocation: {
        select: { name: true, addressLine: true, city: true, testCenter: { select: { name: true } } },
      },
      examType: { select: { name: true } },
    },
  });
  if (!appt) {
    return { ok: false, emailSent: false, whatsappSent: false, notes: ["Appointment not found"] };
  }
  if (!appt.testCenterLocation) {
    return {
      ok: false,
      emailSent: false,
      whatsappSent: false,
      notes: ["This appointment is not a test-centre booking"],
    };
  }
  if (!appt.email?.trim()) {
    return {
      ok: false,
      emailSent: false,
      whatsappSent: false,
      notes: ["No email on the appointment"],
    };
  }

  const lang = resolveNotificationLang({
    notificationLocale: appt.notificationLocale,
    countryCode: appt.countryCode,
  });

  // Prefer the address snapshot taken at booking: it is what the patient was
  // originally told, and the branch may have been edited since.
  const branchAddress =
    appt.locationAddress?.trim() ||
    [appt.testCenterLocation.addressLine, appt.testCenterLocation.city]
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(", ");
  const venueName = [appt.testCenterLocation.testCenter?.name, appt.testCenterLocation.name]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" — ");

  const attendance: Attendance = {
    kind: "VENUE",
    display: branchAddress,
    venueName,
  };

  const ctx: TestBookingConfirmationContext = {
    patientName: appt.fullName,
    examName: appt.examType?.name ?? appt.consultationType,
    appointmentDateTime: appt.scheduledAt
      ? formatDeadline(appt.scheduledAt, appt.patientTimezone, lang)
      : "—",
    attendance,
    labReference: appt.labReference,
  };
  if (!appt.scheduledAt) notes.push("This booking has no date yet — sent without one");
  if (!ctx.labReference?.trim()) {
    notes.push("No lab reference saved — sent as a plain date/time/location confirmation");
  }

  const text = patientWhatsAppTestBookingConfirmation(ctx, lang);
  const summary = "Patient — test booking confirmed";

  // ── Email ────────────────────────────────────────────────────────────────
  let emailSent = false;
  const emailRun = await createAutomationRun({
    automationKey: "test_booking_confirmation_patient_email",
    appointmentId: appt.id,
    channel: "email",
    recipient: appt.email,
    summary,
    status: "RUNNING",
  }).catch(() => null);
  try {
    await sendAutomationEmail(
      {
        to: appt.email,
        subject: patientEmailSubjectTestBookingConfirmation(ctx, lang),
        text,
        html: confirmationHtml(ctx, `Hi ${ctx.patientName}, your test appointment is confirmed.`),
      },
      { recordLabel: appt.id },
    );
    emailSent = true;
    if (emailRun) await finishAutomationRun(emailRun.id, { status: "SUCCESS", summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    notes.push(`Email failed: ${message}`);
    if (emailRun) {
      await finishAutomationRun(emailRun.id, { status: "FAILED", summary, error: message }).catch(
        () => undefined,
      );
    }
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  // Consent lives on the ORDER that paid for this booking; the appointment
  // itself carries none. No order (an admin-made booking) → no recorded
  // consent, and the gate fails closed rather than guessing.
  const orderItem = await prisma.orderItem.findFirst({
    where: { appointmentId: appt.id },
    select: { order: { select: { whatsappConsent: true } }, patientWhatsappConsent: true },
  });
  const consent = orderItem?.patientWhatsappConsent === true || orderItem?.order?.whatsappConsent === true;

  let whatsappSent = false;
  if (!appt.phone?.trim()) {
    notes.push("No phone on the appointment — WhatsApp skipped");
  } else if (!consent) {
    notes.push("No WhatsApp consent recorded for this booking — WhatsApp skipped");
  } else {
    const run = await createAutomationRun({
      automationKey: "test_booking_confirmation_patient_whatsapp",
      appointmentId: appt.id,
      channel: "whatsapp",
      recipient: appt.phone,
      summary,
      status: "RUNNING",
    }).catch(() => null);
    try {
      const result = await sendWhatsAppText({
        to: appt.phone,
        message: text,
        hints: { orderCountryCode: appt.countryCode },
        patientConsent: consent,
      });
      if (!result.ok && !result.skipped) {
        notes.push(`WhatsApp failed: ${formatWhatsAppSendError(result)}`);
        if (run) {
          await finishAutomationRun(run.id, {
            status: "FAILED",
            summary,
            error: formatWhatsAppSendError(result),
            recipient: result.to ?? appt.phone,
          });
        }
      } else if (result.skipped) {
        notes.push(result.message ?? "WhatsApp not configured — skipped");
        if (run) {
          await finishAutomationRun(run.id, {
            status: "SKIPPED",
            summary: `${summary} (${result.message ?? "skipped"})`,
            recipient: result.to ?? appt.phone,
          });
        }
      } else {
        whatsappSent = true;
        if (run) {
          await finishAutomationRun(run.id, {
            status: "SUCCESS",
            summary,
            recipient: result.to ?? appt.phone,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      notes.push(`WhatsApp failed: ${message}`);
      if (run) {
        await finishAutomationRun(run.id, { status: "FAILED", summary, error: message }).catch(
          () => undefined,
        );
      }
    }
  }

  // Only when something actually reached the patient — stamping on a total
  // failure would tell the next admin the patient had been told.
  if (emailSent || whatsappSent) {
    await prisma.appointment
      .update({ where: { id: appt.id }, data: { labConfirmationSentAt: new Date() } })
      .catch(() => undefined);
  }

  return { ok: emailSent || whatsappSent, emailSent, whatsappSent, notes };
}
