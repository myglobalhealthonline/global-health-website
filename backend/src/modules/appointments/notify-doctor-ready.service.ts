import { prisma } from "../../db/prisma.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import type { LocaleCode } from "@prisma/client";
import { resolveNotificationLang } from "../automation/notification-language.js";
import {
  doctorReadyEmailHtml,
  doctorReadyEmailSubject,
  doctorReadyEmailText,
  doctorReadyWhatsAppMessage,
  type DoctorReadyLang,
} from "../automation/doctor-ready-messages.js";

const SUPPORTED_LANGS: readonly DoctorReadyLang[] = ["en", "pt", "ro", "cs", "es"];

/**
 * `notificationLocale` — the language the patient booked in, or the operator's
 * manual-booking choice — outranks everything. `consultationLanguageCode` is
 * kept as the next-best signal for rows minted before that column existed: it
 * is the language the consult is SPOKEN in, which is a decent guess at the
 * patient's language but is not the same thing.
 */
function resolveLang(input: {
  notificationLocale: LocaleCode | null;
  consultationLanguageCode: string | null;
  countryCode: string;
  consultationType: string;
}): DoctorReadyLang {
  if (!input.notificationLocale) {
    const explicit = input.consultationLanguageCode?.trim().toLowerCase();
    if (explicit && (SUPPORTED_LANGS as readonly string[]).includes(explicit)) {
      return explicit as DoctorReadyLang;
    }
  }
  return resolveNotificationLang({
    notificationLocale: input.notificationLocale,
    countryCode: input.countryCode,
    serviceName: input.consultationType,
  });
}

export type NotifyDoctorReadyChannel = "email" | "whatsapp";

export type NotifyDoctorReadyResult =
  | {
      ok: true;
      sent: NotifyDoctorReadyChannel[];
      failed: NotifyDoctorReadyChannel[];
      missingPhone: boolean;
      missingConsent: boolean;
    }
  | { ok: false; status: 400 | 404; message: string };

/**
 * "Doctor is ready" one-click notification — fired from the doctor's
 * appointment row/workspace once they're in the consultation room. Mirrors
 * `sendAppointmentUploadLink`'s shape (same doctor-scoped lookup, same
 * sent/failed/missingPhone result) so the frontend action pattern is
 * familiar, but always sends both channels — the doctor is telling the
 * patient "come in now", not choosing a delivery method.
 */
export async function notifyPatientDoctorReady(opts: {
  appointmentId: string;
  /** Restricts the lookup to the caller's own rows. */
  doctorIdScope: string;
}): Promise<NotifyDoctorReadyResult> {
  const appt = await prisma.appointment.findFirst({
    where: { id: opts.appointmentId, doctorId: opts.doctorIdScope },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      consultationType: true,
      consultationLanguageCode: true,
      notificationLocale: true,
      whatsappConsent: true,
      meetingUrl: true,
      status: true,
      scheduledAt: true,
      doctor: { select: { fullName: true } },
    },
  });
  if (!appt) {
    return { ok: false, status: 404, message: "Appointment not found" };
  }
  if (!appt.meetingUrl) {
    return {
      ok: false,
      status: 400,
      message: "This appointment has no meeting link yet",
    };
  }
  if (!appt.email) {
    return { ok: false, status: 400, message: "This appointment has no patient email" };
  }
  // Only finalized rows are refused. The slot's end instant is deliberately
  // NOT a guard: doctors run late, and an overdue-but-still-open consultation
  // is precisely when "I'm ready, come in" needs to reach the patient.
  if (appt.status === "COMPLETED" || appt.status === "CANCELLED") {
    return {
      ok: false,
      status: 400,
      message: "This consultation is already closed",
    };
  }

  const lang = resolveLang({
    notificationLocale: appt.notificationLocale,
    consultationLanguageCode: appt.consultationLanguageCode,
    countryCode: appt.countryCode,
    consultationType: appt.consultationType,
  });

  const ctx = {
    patientName: appt.fullName,
    doctorName: appt.doctor?.fullName ?? "your doctor",
    serviceName: appt.consultationType,
    meetingUrl: appt.meetingUrl,
  };

  const sent: NotifyDoctorReadyChannel[] = [];
  const failed: NotifyDoctorReadyChannel[] = [];
  let missingPhone = false;
  let missingConsent = false;

  try {
    const res = await sendEmail({
      to: appt.email,
      subject: doctorReadyEmailSubject(lang),
      text: doctorReadyEmailText(ctx, lang),
      html: doctorReadyEmailHtml(ctx, lang),
    });
    if (res.ok && res.mode !== "log") sent.push("email");
    else failed.push("email");
  } catch {
    failed.push("email");
  }

  if (!appt.phone) {
    missingPhone = true;
    failed.push("whatsapp");
  } else if (!appt.whatsappConsent) {
    missingConsent = true;
    failed.push("whatsapp");
  } else {
    try {
      const wa = await sendWhatsAppText({
        to: appt.phone,
        message: doctorReadyWhatsAppMessage(ctx, lang),
        hints: { orderCountryCode: appt.countryCode },
        patientConsent: appt.whatsappConsent,
      });
      if (wa.ok && !wa.skipped) sent.push("whatsapp");
      else failed.push("whatsapp");
    } catch {
      failed.push("whatsapp");
    }
  }

  return { ok: true, sent, failed, missingPhone, missingConsent };
}
