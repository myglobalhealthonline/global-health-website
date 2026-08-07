import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import {
  sendPatientMessageAdminAlertEmail,
  sendPatientMessageDoctorAlertEmail,
} from "../../lib/email/templates.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import { adminNotifyWhatsAppNumbers } from "../automation/admin-booking-alert.service.js";
import { resolveSupportAdminEmails } from "../support/support-notify.service.js";
import { resolveDoctorContact, formatDoctorGreetingName } from "../../lib/whatsapp/resolve-doctor-contact.js";

/**
 * Email + WhatsApp fan-out for a patient message on either the patient↔admin
 * (clinic) or patient↔doctor consultation thread — separate from the
 * in-portal bell (`notifyAdmins` / `notifyDoctor`), which fires on every
 * message unconditionally.
 *
 * Throttled per appointment/thread, same shape as
 * `alertAdminsOfSupportMessage`: a conditional `updateMany` claims the
 * window so two concurrent POSTs can't double-send, and a burst of
 * consecutive patient messages only alerts once per
 * `PATIENT_MESSAGE_ALERT_THROTTLE_MINUTES`.
 *
 * Every function is best-effort and must never throw into the request path —
 * invoke as `void alertAdminsOfPatientMessage(...)` / `void
 * alertDoctorOfPatientMessage(...)`.
 */

function throttleCutoff(): Date {
  const windowMs = env.PATIENT_MESSAGE_ALERT_THROTTLE_MINUTES * 60 * 1000;
  return new Date(Date.now() - windowMs);
}

export async function alertAdminsOfPatientMessage(args: {
  appointmentId: string;
  patientName: string;
  snippet: string | null;
  log: FastifyBaseLogger;
}): Promise<void> {
  const { appointmentId, patientName, snippet, log } = args;
  try {
    const now = new Date();
    const claimed = await prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        OR: [
          { lastPatientMsgAdminAlertAt: null },
          { lastPatientMsgAdminAlertAt: { lt: throttleCutoff() } },
        ],
      },
      data: { lastPatientMsgAdminAlertAt: now },
    });
    if (claimed.count === 0) {
      log.info(
        { appointmentId },
        "patient message admin alert suppressed — inside throttle window (bell only)",
      );
      return;
    }

    const threadUrl = absoluteSiteUrl(`/admin/messages?open=${encodeURIComponent(appointmentId)}`);

    const numbers = adminNotifyWhatsAppNumbers();
    const waText = `${patientName} sent a message in the clinic chat${snippet ? `:\n"${snippet}"` : "."}\n\n${threadUrl}`;
    const waResults = await Promise.allSettled(
      numbers.map((to) => sendWhatsAppText({ to, message: waText })),
    );
    waResults.forEach((r, i) => {
      if (r.status === "rejected") {
        log.warn({ appointmentId, to: numbers[i] }, "patient message admin WhatsApp alert failed");
      } else if (!r.value.ok && !r.value.skipped) {
        log.warn(
          { appointmentId, to: numbers[i], error: formatWhatsAppSendError(r.value) },
          "patient message admin WhatsApp alert failed",
        );
      }
    });

    const emails = await resolveSupportAdminEmails();
    if (emails.length === 0) {
      log.warn({ appointmentId }, "patient message admin alert email skipped — no admin recipients resolved");
      return;
    }
    const emailResults = await Promise.allSettled(
      emails.map((to) => sendPatientMessageAdminAlertEmail({ to, patientName, threadUrl, snippet })),
    );
    const failed = emailResults.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok),
    ).length;
    if (failed > 0) {
      log.warn(
        { appointmentId, failed, total: emails.length },
        "some patient message admin alert emails failed to send",
      );
    }
  } catch (error) {
    log.warn({ err: error, appointmentId }, "patient message admin alert fan-out failed");
  }
}

export async function alertDoctorOfPatientMessage(args: {
  appointmentId: string;
  doctorId: string;
  patientName: string;
  snippet: string | null;
  log: FastifyBaseLogger;
}): Promise<void> {
  const { appointmentId, doctorId, patientName, snippet, log } = args;
  try {
    const now = new Date();
    const claimed = await prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        OR: [
          { lastPatientMsgDoctorAlertAt: null },
          { lastPatientMsgDoctorAlertAt: { lt: throttleCutoff() } },
        ],
      },
      data: { lastPatientMsgDoctorAlertAt: now },
    });
    if (claimed.count === 0) {
      log.info(
        { appointmentId },
        "patient message doctor alert suppressed — inside throttle window (bell only)",
      );
      return;
    }

    const contact = await resolveDoctorContact(doctorId);
    if (!contact) {
      log.warn({ appointmentId, doctorId }, "patient message doctor alert skipped — doctor not found");
      return;
    }

    const threadUrl = absoluteSiteUrl(`/doctor/messages?open=${encodeURIComponent(appointmentId)}`);

    if (contact.whatsappNumber) {
      const greeting = formatDoctorGreetingName(contact);
      const waText = `Hello ${greeting}, ${patientName} sent you a message${snippet ? `:\n"${snippet}"` : "."}\n\n${threadUrl}`;
      const result = await sendWhatsAppText({ to: contact.whatsappNumber, message: waText });
      if (!result.ok && !result.skipped) {
        log.warn(
          { appointmentId, doctorId, error: formatWhatsAppSendError(result) },
          "patient message doctor WhatsApp alert failed",
        );
      }
    } else {
      log.info({ appointmentId, doctorId }, "patient message doctor WhatsApp alert skipped — no usable number");
    }

    if (contact.loginEmail) {
      const result = await sendPatientMessageDoctorAlertEmail({
        to: contact.loginEmail,
        patientName,
        threadUrl,
        snippet,
      });
      if (!result.ok) {
        log.warn({ appointmentId, doctorId }, "patient message doctor alert email failed");
      }
    } else {
      log.warn({ appointmentId, doctorId }, "patient message doctor alert email skipped — no login email");
    }
  } catch (error) {
    log.warn({ err: error, appointmentId, doctorId }, "patient message doctor alert fan-out failed");
  }
}
