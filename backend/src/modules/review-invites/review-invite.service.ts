import { randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { sendReviewInviteEmail } from "../../lib/email/templates.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { getReviewFormLocale } from "../../lib/i18n/review-form.js";

const INVITE_TTL_DAYS = 14;

function reviewUrl(token: string): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/reviews/rate?token=${encodeURIComponent(token)}`;
}

export async function createReviewInviteForAppointment(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { fullName: true } },
      service: { select: { name: true } },
    },
  });
  if (!appt || appt.status !== "COMPLETED") return null;

  const existing = await prisma.reviewInvite.findFirst({
    where: { appointmentId, submittedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.expiresAt > new Date()) {
    return existing;
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const localeCode = appt.countryCode === "br" ? "pt-br" : "en";

  const invite = await prisma.reviewInvite.create({
    data: {
      token,
      appointmentId: appt.id,
      customerName: appt.fullName,
      contactEmail: appt.email,
      contactPhone: appt.phone,
      doctorName: appt.doctor ? appt.doctor.fullName.trim() : null,
      serviceName: appt.service?.name ?? appt.consultationType,
      localeCode,
      expiresAt,
    },
  });

  const locale = getReviewFormLocale(localeCode);
  const link = reviewUrl(token);
  await sendReviewInviteEmail({
    to: appt.email,
    patientName: appt.fullName,
    link,
    localeTitle: locale.title,
  });

  if (appt.phone) {
    await sendWhatsAppText({
      to: appt.phone,
      message: `${locale.title}\n${link}`,
    });
  }

  return invite;
}

export async function getReviewInviteByToken(token: string) {
  return prisma.reviewInvite.findUnique({
    where: { token },
    include: {
      appointment: {
        select: { id: true, fullName: true, countryCode: true },
      },
    },
  });
}

export async function submitReviewInvite(
  token: string,
  ratings: {
    overallSatisfaction: number;
    doctorProfessionalism: number;
    communicationClarity: number;
    timelinessOfService: number;
    valueForMoney: number;
    likeliness: number;
    bookingExperience: number;
  },
) {
  const invite = await prisma.reviewInvite.findUnique({ where: { token } });
  if (!invite) return { ok: false as const, message: "Review not found" };
  if (invite.submittedAt) return { ok: false as const, message: "Review already submitted" };
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, message: "Review link has expired" };
  }

  await prisma.reviewInvite.update({
    where: { id: invite.id },
    data: {
      ...ratings,
      submittedAt: new Date(),
    },
  });
  return { ok: true as const };
}
