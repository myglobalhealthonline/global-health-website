import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { detectAutomationLanguage } from "../automation/pre-payment-messages.js";
import {
  identityEmailHtml,
  identityEmailSubject,
  identityEmailText,
  identityWhatsAppMessage,
} from "./identity-verification-messages.js";

/**
 * Asks a patient to complete identity verification.
 *
 * Runs in every market, so the language is resolved per patient the same way
 * the booking notifications do it — from the appointment's country, falling
 * back to the service name and then English.
 */

export type NotifyChannel = "email" | "whatsapp";

export type NotifyVerificationResult = {
  sent: NotifyChannel[];
  failed: NotifyChannel[];
  missingPhone: boolean;
  missingConsent: boolean;
};

function verificationUrl(): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/account/profile?tab=verification`;
}

/**
 * Send the request. Never throws: a failed notification must not roll back the
 * request itself — the patient still sees the prompt in their portal, and the
 * doctor can re-send.
 */
export async function notifyPatientVerificationRequested(input: {
  patientEmail: string;
  doctorName?: string | null;
}): Promise<NotifyVerificationResult> {
  const sent: NotifyChannel[] = [];
  const failed: NotifyChannel[] = [];
  let missingPhone = false;
  let missingConsent = false;

  const profile = await prisma.patientProfile.findFirst({
    where: { email: { equals: input.patientEmail.trim(), mode: "insensitive" } },
    select: { fullName: true, phone: true, email: true },
  });

  // WhatsApp consent and the country that decides language both live on the
  // appointment, not the profile — mirror the lookup the other patient
  // notifications use rather than assuming either.
  const appt = await prisma.appointment.findFirst({
    where: { email: { equals: input.patientEmail.trim(), mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      whatsappConsent: true,
      phone: true,
      countryCode: true,
      consultationType: true,
      consultationLanguageCode: true,
    },
  });

  // An explicit consultation language beats the country guess: a Portuguese
  // speaker booking in Ireland should not be handed English.
  const explicit = appt?.consultationLanguageCode?.trim().toLowerCase();
  const lang =
    explicit && ["en", "pt", "es", "cs", "ro"].includes(explicit)
      ? (explicit as ReturnType<typeof detectAutomationLanguage>)
      : detectAutomationLanguage({
          countryCode: appt?.countryCode ?? null,
          serviceName: appt?.consultationType ?? null,
        });

  const ctx = {
    patientName: profile?.fullName?.trim() || input.patientEmail.split("@")[0],
    doctorName: input.doctorName?.trim() || null,
    verificationUrl: verificationUrl(),
  };

  try {
    const res = await sendEmail({
      to: profile?.email ?? input.patientEmail,
      subject: identityEmailSubject(lang),
      text: identityEmailText(ctx, lang),
      html: identityEmailHtml(ctx, lang),
    });
    if (res.ok && res.mode !== "log") sent.push("email");
    else failed.push("email");
  } catch {
    failed.push("email");
  }

  const phone = profile?.phone ?? appt?.phone ?? null;
  if (!phone) {
    missingPhone = true;
  } else if (!appt?.whatsappConsent) {
    missingConsent = true;
  } else {
    try {
      const wa = await sendWhatsAppText({
        to: phone,
        message: identityWhatsAppMessage(ctx, lang),
        hints: { orderCountryCode: appt.countryCode },
        patientConsent: appt.whatsappConsent,
      });
      if (wa.ok && !wa.skipped) sent.push("whatsapp");
      else failed.push("whatsapp");
    } catch {
      failed.push("whatsapp");
    }
  }

  return { sent, failed, missingPhone, missingConsent };
}
