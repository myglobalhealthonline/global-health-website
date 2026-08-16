import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";

/**
 * Asks a patient to complete identity verification before a controlled
 * medication can be prescribed.
 *
 * English only, deliberately: this workflow is scoped to Ireland. The
 * multi-language machinery used by booking notifications would be dead code
 * here and would imply the feature runs in markets where it does not.
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

function emailText(patientName: string, doctorName: string | null): string {
  const who = doctorName ? `${doctorName} has` : "Your doctor has";
  return [
    `Hello ${patientName},`,
    "",
    `${who} asked you to confirm your identity before your consultation.`,
    "",
    "Irish rules require us to confirm who you are before certain medications can be prescribed. It takes about two minutes:",
    "",
    "  1. Sign in to your Global Health account",
    "  2. Upload a photo of your passport or national ID card",
    "  3. Take a photo of your face with your phone or webcam",
    "",
    verificationUrl(),
    "",
    "Your documents are stored securely and are only visible to you and the clinicians treating you.",
    "",
    "Global Health",
  ].join("\n");
}

function emailHtml(patientName: string, doctorName: string | null): string {
  const who = doctorName ? `${escapeHtml(doctorName)} has` : "Your doctor has";
  const url = verificationUrl();
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0F2E25">
  <p>Hello ${escapeHtml(patientName)},</p>
  <p>${who} asked you to confirm your identity before your consultation.</p>
  <p>Irish rules require us to confirm who you are before certain medications can be prescribed. It takes about two minutes:</p>
  <ol>
    <li>Sign in to your Global Health account</li>
    <li>Upload a photo of your passport or national ID card</li>
    <li>Take a photo of your face with your phone or webcam</li>
  </ol>
  <p><a href="${url}" style="background:#0F2E25;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Verify my identity</a></p>
  <p style="color:#5b6b66;font-size:13px">Your documents are stored securely and are only visible to you and the clinicians treating you.</p>
  <p>Global Health</p>
</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function whatsAppMessage(patientName: string): string {
  return [
    `Hello ${patientName}, this is Global Health.`,
    "",
    "Before your consultation we need to confirm your identity. Please sign in and upload your ID plus a photo of your face:",
    verificationUrl(),
    "",
    "It takes about two minutes.",
  ].join("\n");
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

  // WhatsApp consent lives on the appointment, not the profile — mirror the
  // lookup the other patient notifications use rather than assuming consent.
  const appt = await prisma.appointment.findFirst({
    where: { email: { equals: input.patientEmail.trim(), mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: { whatsappConsent: true, phone: true, countryCode: true },
  });

  const patientName = profile?.fullName?.trim() || "there";
  const doctorName = input.doctorName?.trim() || null;

  try {
    const res = await sendEmail({
      to: profile?.email ?? input.patientEmail,
      subject: "Please confirm your identity before your consultation",
      text: emailText(patientName, doctorName),
      html: emailHtml(patientName, doctorName),
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
        message: whatsAppMessage(patientName),
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
