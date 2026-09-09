import { createHmac, timingSafeEqual } from "node:crypto";
import type { LocaleCode } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";

export const BIRTHDAY_UNSUBSCRIBE_TOKEN_MAX_LENGTH = 172;
const OFFER_ID = /^[A-Za-z0-9_-]{1,128}$/;

function signature(id: string): string {
  return createHmac("sha256", env.AUTH_JWT_SECRET)
    .update(`birthday-unsubscribe\0${id}`).digest("base64url");
}

export function birthdayUnsubscribeUrl(offerId: string, locale?: LocaleCode): string {
  if (!OFFER_ID.test(offerId)) throw new Error("Invalid offer ID");
  const lang = locale && ["EN", "PT", "ES", "CS", "RO", "DE"].includes(locale) ? `&lang=${locale.toLowerCase()}` : "";
  return absoluteSiteUrl(`/unsubscribe?token=${encodeURIComponent(`${offerId}.${signature(offerId)}`)}${lang}`);
}

/** Invalid and erased offers expose no identity; opening a link never calls this. */
export async function unsubscribeBirthdayMarketing(token: string): Promise<boolean> {
  if (typeof token !== "string" || token.length > BIRTHDAY_UNSUBSCRIBE_TOKEN_MAX_LENGTH) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !OFFER_ID.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
  const [id, supplied] = parts;
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(signature(id)))) return false;

  // Serializable retries keep simultaneous double submits from appending duplicates.
  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const offer = await tx.birthdayOffer.findUnique({
          where: { id },
          select: {
            patient: { select: { id: true, email: true, anonymizedAt: true, mergedIntoPatientId: true } },
            coupon: { select: { personalEmail: true } },
          },
        });
        if (!offer?.patient || offer.patient.anonymizedAt) return;
        let patient = offer.patient;
        const emails = new Set<string>();
        if (offer.coupon?.personalEmail) emails.add(offer.coupon.personalEmail.trim().toLowerCase());
        const visited = new Set<string>();
        for (;;) {
          if (visited.has(patient.id) || visited.size >= 32) throw new Error("Unable to resolve unsubscribe request");
          visited.add(patient.id);
          emails.add(patient.email.trim().toLowerCase());
          if (!patient.mergedIntoPatientId) break;
          const next = await tx.patientProfile.findUnique({
            where: { id: patient.mergedIntoPatientId },
            select: { id: true, email: true, anonymizedAt: true, mergedIntoPatientId: true },
          });
          if (!next || next.anonymizedAt) return;
          patient = next;
        }
        const patientProfileId = patient.id;
        const latest = await tx.patientConsent.findFirst({
          where: { patientProfileId, consentType: "MARKETING" },
          orderBy: [{ createdAt: "desc" }, { consentValue: "asc" }],
          select: { consentValue: true },
        });
        if (latest?.consentValue !== false) {
          await tx.patientConsent.create({
            data: { patientProfileId, consentType: "MARKETING", consentValue: false, source: "EMAIL_UNSUBSCRIBE" },
          });
          await tx.auditLog.create({
            data: { action: "CONSENT_UPDATED", entityType: "PatientProfile", entityId: patientProfileId,
              metadata: { source: "EMAIL_UNSUBSCRIBE", consentType: "MARKETING", consentValue: false } },
          });
        }
        await tx.newsletterSubscriber.updateMany({
          where: { OR: [...emails].map((email) => ({ email: { equals: email, mode: "insensitive" as const } })), unsubscribedAt: null },
          data: { unsubscribedAt: new Date() },
        });
      }, { isolationLevel: "Serializable" });
      return true;
    } catch (error) {
      if (attempt < 2 && typeof error === "object" && error !== null && "code" in error && error.code === "P2034") continue;
      throw error;
    }
  }
}
