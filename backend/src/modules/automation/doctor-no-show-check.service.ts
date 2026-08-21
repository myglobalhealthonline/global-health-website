import { prisma } from "../../db/prisma.js";
import { paidAppointmentWhere } from "../appointments/appointment-payment-gate.js";
import { checkDoctorJoinedMeeting } from "../../lib/google-meet/check-doctor-joined.js";
import {
  resolveDoctorContact,
  formatDoctorGreetingName,
} from "../../lib/whatsapp/resolve-doctor-contact.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { detectAutomationLanguage } from "./pre-payment-messages.js";
import { createAutomationRun } from "./automation-run.service.js";
import {
  doctorNoShowEmailHtml,
  doctorNoShowEmailSubject,
  doctorNoShowEmailText,
  doctorNoShowWhatsAppMessage,
  type DoctorNoShowLang,
} from "./doctor-no-show-messages.js";

const MS_MINUTE = 60_000;
const SUPPORTED_LANGS: readonly DoctorNoShowLang[] = ["en", "pt", "ro", "cs", "es"];

function resolveLang(input: {
  consultationLanguageCode: string | null;
  countryCode: string;
  consultationType: string;
}): DoctorNoShowLang {
  const explicit = input.consultationLanguageCode?.trim().toLowerCase();
  if (explicit && (SUPPORTED_LANGS as readonly string[]).includes(explicit)) {
    return explicit as DoctorNoShowLang;
  }
  const detected = detectAutomationLanguage({
    countryCode: input.countryCode,
    serviceName: input.consultationType,
  });
  return (SUPPORTED_LANGS as readonly string[]).includes(detected)
    ? (detected as DoctorNoShowLang)
    : "en";
}

/**
 * Runs at consultation start+5min. Checks the Meet space's full participant
 * history for the assigned doctor's name; if absent, nudges them by email
 * + WhatsApp with the join link. Fires once per appointment
 * (`doctorNoShowNotifiedAt` guard) — a Meet API failure leaves the guard
 * unset so the next tick retries instead of guessing either way.
 */
export async function runDoctorNoShowCheckCron() {
  const now = new Date();
  // Lower bound guards against a long scheduler outage suddenly notifying a
  // backlog of doctors about consultations that are long over.
  const windowStart = new Date(now.getTime() - 30 * MS_MINUTE);
  const windowEnd = new Date(now.getTime() - 5 * MS_MINUTE);

  const candidates = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: windowStart, lte: windowEnd },
      doctorNoShowNotifiedAt: null,
      doctorId: { not: null },
      meetingUrl: { not: null },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      // Unpaid consultations are not consultations. Without this an unpaid
      // manual booking that reaches its start time still nudges the doctor —
      // and it can, because the pre-payment cancel sweep may not have run yet
      // (its deadline is clock-based, not tied to the consultation start).
      AND: [paidAppointmentWhere],
    },
    select: {
      id: true,
      doctorId: true,
      meetingUrl: true,
      countryCode: true,
      consultationType: true,
      consultationLanguageCode: true,
    },
    take: 100,
    orderBy: { scheduledAt: "asc" },
  });

  let checked = 0;
  let notified = 0;
  let unknown = 0;

  for (const appt of candidates) {
    if (!appt.meetingUrl || !appt.doctorId) continue;
    checked++;

    const doctorContact = await resolveDoctorContact(appt.doctorId);
    if (!doctorContact) continue;

    const result = await checkDoctorJoinedMeeting(appt.meetingUrl, doctorContact.fullName);

    if (result.status === "joined") {
      // Doctor showed up on their own — mark checked, nothing to send.
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { doctorNoShowNotifiedAt: now },
      });
      continue;
    }
    if (result.status === "unknown") {
      unknown++;
      continue; // Meet API call failed — retry next tick, guard stays null.
    }

    // Claim the row first so a slow send can't race the next tick into a
    // duplicate send for the same appointment.
    const claim = await prisma.appointment.updateMany({
      where: { id: appt.id, doctorNoShowNotifiedAt: null },
      data: { doctorNoShowNotifiedAt: now },
    });
    if (claim.count === 0) continue; // Already claimed by a concurrent run.

    const lang = resolveLang({
      consultationLanguageCode: appt.consultationLanguageCode,
      countryCode: appt.countryCode,
      consultationType: appt.consultationType,
    });
    const ctx = {
      doctorName: formatDoctorGreetingName(doctorContact),
      serviceName: appt.consultationType,
      meetingUrl: appt.meetingUrl,
    };

    if (doctorContact.loginEmail) {
      try {
        const res = await sendEmail({
          to: doctorContact.loginEmail,
          subject: doctorNoShowEmailSubject(lang),
          text: doctorNoShowEmailText(ctx, lang),
          html: doctorNoShowEmailHtml(ctx, lang),
        });
        await createAutomationRun({
          automationKey: "doctor_no_show_email",
          appointmentId: appt.id,
          channel: "email",
          status: res.ok ? "SUCCESS" : "FAILED",
          recipient: doctorContact.loginEmail,
          summary: "Doctor email — no-show 5 minute check",
        });
      } catch (err) {
        await createAutomationRun({
          automationKey: "doctor_no_show_email",
          appointmentId: appt.id,
          channel: "email",
          status: "FAILED",
          recipient: doctorContact.loginEmail,
          summary: "Doctor email — no-show 5 minute check",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      await createAutomationRun({
        automationKey: "doctor_no_show_email",
        appointmentId: appt.id,
        channel: "email",
        status: "SKIPPED",
        summary: "Doctor email — no-show check (no portal login email on doctor)",
      });
    }

    if (doctorContact.whatsappNumber) {
      try {
        const wa = await sendWhatsAppText({
          to: doctorContact.whatsappNumber,
          message: doctorNoShowWhatsAppMessage(ctx, lang),
          hints: doctorContact.whatsappHints,
        });
        await createAutomationRun({
          automationKey: "doctor_no_show_whatsapp",
          appointmentId: appt.id,
          channel: "whatsapp",
          status: wa.ok && !wa.skipped ? "SUCCESS" : "FAILED",
          recipient: doctorContact.whatsappNumber,
          summary: "Doctor WhatsApp — no-show 5 minute check",
        });
      } catch (err) {
        await createAutomationRun({
          automationKey: "doctor_no_show_whatsapp",
          appointmentId: appt.id,
          channel: "whatsapp",
          status: "FAILED",
          recipient: doctorContact.whatsappNumber,
          summary: "Doctor WhatsApp — no-show 5 minute check",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      await createAutomationRun({
        automationKey: "doctor_no_show_whatsapp",
        appointmentId: appt.id,
        channel: "whatsapp",
        status: "SKIPPED",
        summary: doctorContact.whatsappRaw
          ? "Doctor WhatsApp — no-show check (invalid or placeholder number on doctor profile)"
          : "Doctor WhatsApp — no-show check (no WhatsApp number on doctor profile)",
        recipient: doctorContact.whatsappRaw ?? undefined,
      });
    }

    notified++;
  }

  return { candidates: candidates.length, checked, notified, unknown };
}
