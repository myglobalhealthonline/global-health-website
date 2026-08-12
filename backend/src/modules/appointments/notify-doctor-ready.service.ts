import { prisma } from "../../db/prisma.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { detectAutomationLanguage } from "../automation/pre-payment-messages.js";
import { resolveConsultationEndAt } from "./consultation-end.js";
import {
  doctorReadyEmailHtml,
  doctorReadyEmailSubject,
  doctorReadyEmailText,
  doctorReadyWhatsAppMessage,
  type DoctorReadyLang,
} from "../automation/doctor-ready-messages.js";

const SUPPORTED_LANGS: readonly DoctorReadyLang[] = ["en", "pt", "ro", "cs", "es"];

function resolveLang(input: {
  consultationLanguageCode: string | null;
  countryCode: string;
  consultationType: string;
}): DoctorReadyLang {
  const explicit = input.consultationLanguageCode?.trim().toLowerCase();
  if (explicit && (SUPPORTED_LANGS as readonly string[]).includes(explicit)) {
    return explicit as DoctorReadyLang;
  }
  return detectAutomationLanguage({
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
      whatsappConsent: true,
      meetingUrl: true,
      status: true,
      scheduledAt: true,
      timeSlot: { select: { endAt: true } },
      service: { select: { durationMinutes: true } },
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
  const endAt = resolveConsultationEndAt(appt);
  const consultationOver =
    appt.status === "COMPLETED" ||
    appt.status === "CANCELLED" ||
    (endAt != null && new Date(endAt).getTime() < Date.now());
  if (consultationOver) {
    return {
      ok: false,
      status: 400,
      message: "This consultation's time has already passed",
    };
  }

  const lang = resolveLang({
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
