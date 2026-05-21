import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";

const BRAZIL_CONSENT_AMOUNT_CENTS = 2900;

export async function getBrazilConsentFormData(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      dateOfBirth: true,
      pharmacy: true,
      symptoms: true,
      status: true,
    },
  });
  if (!appt || appt.countryCode.toLowerCase() !== "br") {
    return null;
  }
  const submission = await prisma.brazilConsentSubmission.findFirst({
    where: { appointmentId },
    orderBy: { createdAt: "desc" },
  });
  return { appointment: appt, submission };
}

export async function submitBrazilConsent(input: {
  appointmentId: string;
  fullName?: string;
  dob?: string;
  address?: string;
  email?: string;
  phone?: string;
  pharmacy?: string;
  message?: string;
  gdprConsent: boolean;
}) {
  if (!input.gdprConsent) {
    throw new Error("Consent is required");
  }
  const appt = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, countryCode: true, fullName: true, email: true },
  });
  if (!appt || appt.countryCode.toLowerCase() !== "br") {
    return null;
  }

  const submission = await prisma.brazilConsentSubmission.create({
    data: {
      appointmentId: appt.id,
      fullName: input.fullName?.trim() || appt.fullName,
      dob: input.dob?.trim() || null,
      address: input.address?.trim() || null,
      email: (input.email?.trim() || appt.email).toLowerCase(),
      phone: input.phone?.trim() || null,
      pharmacy: input.pharmacy?.trim() || null,
      message: input.message?.trim() || "",
      gdprConsent: true,
    },
  });

  let checkoutUrl: string | null = null;
  if (isStripeConfigured()) {
    const stripe = getStripeClient();
    const success =
      env.STRIPE_SUCCESS_URL ??
      `${(env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/brazil/consent/success`;
    const cancel =
      env.STRIPE_CANCEL_URL ??
      `${(env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/brazil/consent?appointmentId=${appt.id}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: submission.id,
      metadata: {
        kind: "brazil_consent",
        submissionId: submission.id,
        appointmentId: appt.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: BRAZIL_CONSENT_AMOUNT_CENTS,
            product_data: {
              name: "Brazil medical consent processing",
            },
          },
        },
      ],
      success_url: `${success}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel,
    });

    checkoutUrl = session.url;
    await prisma.brazilConsentSubmission.update({
      where: { id: submission.id },
      data: { stripeSessionId: session.id },
    });
  }

  const notifyEmail = env.BRAZIL_CONSENT_NOTIFY_EMAIL;
  if (notifyEmail) {
    await sendEmail({
      to: notifyEmail,
      subject: `Brazil consent submitted — ${appt.fullName}`,
      text: `New Brazil consent for appointment ${appt.id}.\nPatient: ${submission.fullName}\nEmail: ${submission.email}`,
      html: `<p>New Brazil consent for appointment <strong>${appt.id}</strong>.</p><p>Patient: ${submission.fullName}<br/>Email: ${submission.email}</p>`,
    });
  }

  const doctorPhone = env.BRAZIL_CONSENT_DOCTOR_PHONE;
  if (doctorPhone) {
    await sendWhatsAppText({
      to: doctorPhone,
      message: `Novo consentimento Brasil: ${submission.fullName} (${appt.id})`,
    });
  }

  return { submission, checkoutUrl };
}

export async function markBrazilConsentPaid(submissionId: string, stripeSessionId: string) {
  return prisma.brazilConsentSubmission.updateMany({
    where: { id: submissionId, paymentStatus: "PENDING" },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      stripeSessionId,
    },
  });
}

export async function getBrazilConsentForDoctor(
  doctorId: string,
  appointmentId: string,
) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true },
  });
  if (!appt) return null;
  return prisma.brazilConsentSubmission.findFirst({
    where: { appointmentId },
    orderBy: { createdAt: "desc" },
  });
}
