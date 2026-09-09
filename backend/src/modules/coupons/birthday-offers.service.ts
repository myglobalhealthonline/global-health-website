import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl, isEmailConfigured, sendEmail } from "../../lib/email/send-email.js";
import { getSetting } from "../settings/settings.service.js";
import { toAuditLogData } from "../audit/audit.service.js";
import { OUTBOX_MAX_ATTEMPTS } from "../outbox/outbox.js";
import { generateCouponCode } from "./coupon-code.js";
import { renderBirthdayEmail } from "./birthday-email.js";
import { birthdayUnsubscribeUrl } from "./birthday-unsubscribe.js";
import { birthdaySettingsSchema, birthdayTimezone, birthdayWindow, DEFAULT_BIRTHDAY_SETTINGS, type BirthdaySettings } from "./birthday-rules.js";

export const BIRTHDAY_SETTING_KEY = "coupons.birthday";
export const BIRTHDAY_OUTBOX_KIND = "birthday_coupon_email";

export async function getBirthdaySettings(): Promise<BirthdaySettings> {
  const stored = await getSetting(BIRTHDAY_SETTING_KEY);
  return stored === null ? { ...DEFAULT_BIRTHDAY_SETTINGS } : birthdaySettingsSchema.parse(stored);
}

export async function saveBirthdaySettings(input: BirthdaySettings, actor: { userId: string | null; role: string | null }) {
  const settings = birthdaySettingsSchema.parse(input);
  await prisma.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { key: BIRTHDAY_SETTING_KEY },
      create: { key: BIRTHDAY_SETTING_KEY, value: settings },
      update: { value: settings },
    });
    await tx.auditLog.create({ data: toAuditLogData({
      action: "BIRTHDAY_SETTINGS_UPDATED", entityType: "Setting", entityId: BIRTHDAY_SETTING_KEY,
      actorUserId: actor.userId, actorRole: actor.role, metadata: settings,
    }) });
  });
  return settings;
}

const patientSelect = {
  id: true, email: true, fullName: true, dateOfBirth: true,
  currentCountryCode: true, countryFolderCode: true, isMerged: true, anonymizedAt: true,
  user: { select: { email: true, dateOfBirth: true, preferredLocale: true, isActive: true, deletionScheduledAt: true, role: true } },
  // A simultaneous withdrawal wins over an opt-in bearing the same timestamp.
  consents: { where: { consentType: "MARKETING" }, orderBy: [{ createdAt: "desc" }, { consentValue: "asc" }], take: 1, select: { consentValue: true } },
  deletionRequests: { where: { requestStatus: { not: "REJECTED" } }, take: 1, select: { id: true } },
  appointments: { where: { patientTimezone: { not: null } }, orderBy: { createdAt: "desc" }, take: 1, select: { patientTimezone: true } },
} satisfies Prisma.PatientProfileSelect;
type BirthdayPatient = Prisma.PatientProfileGetPayload<{ select: typeof patientSelect }>;

const countrySelect = {
  code: true, slug: true, defaultLocale: true, isActive: true, commissionReceiptEnabled: true,
  enabledFeatures: true, bookingSetting: { select: { timezone: true } },
  countryLocales: { select: { locale: true } },
  services: { where: { kind: "GENERAL", isActive: true, visibility: "PUBLIC" }, orderBy: { sortOrder: "asc" }, select: { id: true } },
} satisfies Prisma.CountrySelect;
type BirthdayCountry = Prisma.CountryGetPayload<{ select: typeof countrySelect }>;

function patientDob(patient: BirthdayPatient): Date | null {
  if (patient.user?.dateOfBirth && patient.dateOfBirth &&
    patient.user.dateOfBirth.toISOString().slice(0, 10) !== patient.dateOfBirth.toISOString().slice(0, 10)) return null;
  return patient.user?.dateOfBirth ?? patient.dateOfBirth;
}

function patientEligible(patient: BirthdayPatient): boolean {
  return !patient.isMerged && !patient.anonymizedAt && patient.deletionRequests.length === 0 &&
    patient.consents[0]?.consentValue === true && z.string().email().safeParse(patient.email).success &&
    (!patient.user || (patient.user.isActive && !patient.user.deletionScheduledAt &&
      patient.user.role === "PATIENT" && patient.user.email.toLowerCase() === patient.email.toLowerCase()));
}

function countryCode(patient: BirthdayPatient): string {
  const code = (patient.currentCountryCode ?? patient.countryFolderCode ?? "").trim().toLowerCase();
  return code === "sp" ? "es" : code === "rm" ? "ro" : code;
}

function countryEligible(country: BirthdayCountry | null | undefined): country is BirthdayCountry {
  return Boolean(country?.isActive && !country.commissionReceiptEnabled &&
    country.enabledFeatures.includes("general-consultations") && country.services.length);
}

function annualAddressKey(email: string, year: number) {
  return createHash("sha256").update(`${year}:${email.trim().toLowerCase()}`).digest("hex");
}

/** Enqueue only. Coupon, annual claim and outbox intent commit together. */
export async function enqueueBirthdayOffers(now = new Date(), dryRun = false) {
  const settings = await getBirthdaySettings();
  const result = { scanned: 0, eligible: 0, created: 0 };
  if (!settings.enabled || settings.discountPercent === null) return result;
  const countries = await prisma.country.findMany({ select: countrySelect });
  const byCode = new Map(countries.map((country) => [country.code.toLowerCase(), country]));
  let cursor: string | undefined;
  // ponytail: paged scan of opted-in profiles; add a month/day index if this scan becomes costly.
  for (;;) {
    const patients = await prisma.patientProfile.findMany({
      where: { isMerged: false, anonymizedAt: null, consents: { some: { consentType: "MARKETING", consentValue: true } }, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: patientSelect, orderBy: { id: "asc" }, take: 200,
    });
    if (!patients.length) break;
    const suppressed = new Set((await prisma.newsletterSubscriber.findMany({
      where: { email: { in: patients.map((p) => p.email.toLowerCase()), mode: "insensitive" }, unsubscribedAt: { not: null } }, select: { email: true },
    })).map((row) => row.email.toLowerCase()));
    for (const patient of patients) {
      result.scanned++;
      if (!patientEligible(patient) || suppressed.has(patient.email.toLowerCase())) continue;
      const country = byCode.get(countryCode(patient));
      if (!countryEligible(country)) continue;
      const timezone = birthdayTimezone(patient.appointments[0]?.patientTimezone ?? null, country.bookingSetting?.timezone ?? null);
      const dob = patientDob(patient);
      const window = timezone && dob ? birthdayWindow(dob, now, timezone, settings.validityDays) : null;
      if (!window || !timezone) continue;
      const addressKey = annualAddressKey(patient.email, window.year);
      if (await prisma.birthdayOffer.findFirst({ where: { OR: [
        { patientProfileId: patient.id, year: window.year }, { annualAddressKey: addressKey },
      ] }, select: { id: true } })) continue;
      result.eligible++;
      if (dryRun) continue;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await prisma.$transaction(async (tx) => {
            const offer = await tx.birthdayOffer.create({ data: {
              patient: { connect: { id: patient.id } }, year: window.year, annualAddressKey: addressKey,
              countryCode: country.code, timezone,
              coupon: { create: {
                code: generateCouponCode(), kind: "PERSONAL" as const, scope: "GENERAL_CONSULTATION" as const,
                discountPercent: settings.discountPercent!, maxRedemptions: 1,
                personalEmail: patient.email.toLowerCase(), personalName: patient.fullName,
                validFrom: window.validFrom, validUntil: window.validUntil,
                internalNote: `Birthday offer ${window.year}`,
                recipients: { create: { email: patient.email.toLowerCase(), fullName: patient.fullName, patientProfileId: patient.id } },
              } },
            }, select: { id: true } });
            await tx.outbox.create({ data: {
              kind: BIRTHDAY_OUTBOX_KIND, idempotencyKey: `${BIRTHDAY_OUTBOX_KIND}:${offer.id}`, payload: { offerId: offer.id },
            } });
          });
          result.created++;
          break;
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
          // A competing scheduler won the annual claim, or a random coupon code collided.
          if (await prisma.birthdayOffer.findFirst({ where: { OR: [
            { patientProfileId: patient.id, year: window.year }, { annualAddressKey: addressKey },
          ] }, select: { id: true } })) break;
          if (attempt === 4) throw new Error("Birthday coupon allocation failed");
        }
      }
    }
    cursor = patients[patients.length - 1].id;
  }
  return result;
}

async function finishDelivery(id: string, couponId: string, status: "SENT" | "FAILED" | "UNKNOWN" | "SKIPPED", error: string | null = null) {
  const sentAt = status === "SENT" ? new Date() : null;
  await prisma.$transaction(async (tx) => {
    await tx.birthdayOffer.update({ where: { id }, data: { status, error, sentAt } });
    await tx.couponRecipient.updateMany({ where: { couponId }, data: {
      status: status === "SENT" ? "SENT" : "FAILED", error, sentAt,
    } });
  });
}

/** Provider calls start only after a durable claim. Replays never resend an uncertain attempt. */
export async function dispatchBirthdayOffer(payload: unknown, attempts = 1, now = new Date()): Promise<void> {
  try {
    await dispatchBirthdayOfferAttempt(payload, attempts, now);
  } catch {
    const parsed = z.object({ offerId: z.string().min(1).max(64) }).safeParse(payload);
    if (attempts >= OUTBOX_MAX_ATTEMPTS && parsed.success) {
      const offer = await prisma.birthdayOffer.findUnique({ where: { id: parsed.data.offerId } });
      if (offer?.status === "PENDING") {
        await finishDelivery(offer.id, offer.couponId, "FAILED", "Delivery could not be completed after repeated attempts.");
      } else if (offer?.status === "SENDING") {
        await finishDelivery(offer.id, offer.couponId, "UNKNOWN", "Delivery outcome unknown. Check the email provider before any manual send.");
      }
    }
    throw new Error("Birthday email dispatch failed; check the birthday delivery dashboard");
  }
}

async function dispatchBirthdayOfferAttempt(payload: unknown, attempts: number, now: Date): Promise<void> {
  const { offerId } = z.object({ offerId: z.string().min(1).max(64) }).parse(payload);
  const offer = await prisma.birthdayOffer.findUnique({ where: { id: offerId }, include: { coupon: true, patient: { select: patientSelect } } });
  if (!offer || ["SENT", "FAILED", "UNKNOWN", "SKIPPED"].includes(offer.status)) return;
  if (offer.status === "SENDING") {
    // Allow an in-flight provider call to finish; stale claims need manual reconciliation.
    if (offer.attemptedAt && now.getTime() - offer.attemptedAt.getTime() < 5 * 60_000) throw new Error("Birthday email delivery still in progress");
    await finishDelivery(offer.id, offer.couponId, "UNKNOWN", "Delivery outcome unknown. Check the email provider before any manual send.");
    return;
  }
  const settings = await getBirthdaySettings();
  const patient = offer.patient;
  const country = await prisma.country.findFirst({ where: { code: { equals: countryCode(patient), mode: "insensitive" } }, select: countrySelect });
  const suppressed = await prisma.newsletterSubscriber.findFirst({ where: { email: { equals: patient.email, mode: "insensitive" }, unsubscribedAt: { not: null } }, select: { id: true } });
  const dob = patientDob(patient);
  const window = dob ? birthdayWindow(dob, now, offer.timezone, settings.validityDays) : null;
  if (!settings.enabled || !patientEligible(patient) || suppressed || !countryEligible(country) ||
    country.code.toLowerCase() !== offer.countryCode.toLowerCase() || !window || window.year !== offer.year ||
    offer.coupon.personalEmail !== patient.email.toLowerCase() || !offer.coupon.active ||
    offer.coupon.validUntil < now || offer.coupon.validFrom > now || offer.coupon.redeemedCount > 0) {
    await finishDelivery(offer.id, offer.couponId, "SKIPPED", "Birthday offer is no longer eligible for email delivery.");
    return;
  }
  if (!isEmailConfigured()) {
    if (attempts >= OUTBOX_MAX_ATTEMPTS) await finishDelivery(offer.id, offer.couponId, "FAILED", "No email provider configured.");
    throw new Error("Birthday email provider is not configured");
  }
  const spoken = patient.user?.preferredLocale ? null : await prisma.appointment.findFirst({
    where: { patientProfileId: patient.id, consultationLanguageCode: { not: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { consultationLanguageCode: true },
  });
  const selectedLanguage = patient.user?.preferredLocale ?? spoken?.consultationLanguageCode;
  const language = z.enum(["EN", "PT", "ES", "CS", "RO", "DE"]).safeParse(
    selectedLanguage?.trim().split(/[-_]/)[0].toUpperCase(),
  );
  const locale = language.success ? language.data : "EN";
  const bookingLocale = country.countryLocales.some((row) => row.locale === locale) ? locale : country.defaultLocale;
  const message = renderBirthdayEmail({
    fullName: patient.fullName, locale, code: offer.coupon.code, discountPercent: offer.coupon.discountPercent,
    validUntil: offer.coupon.validUntil, timezone: offer.timezone,
    bookingUrl: absoluteSiteUrl(`/${country.slug}/${bookingLocale.toLowerCase()}/book?serviceId=${encodeURIComponent(country.services[0].id)}`),
    unsubscribeUrl: birthdayUnsubscribeUrl(offer.id, locale),
  });
  const claim = await prisma.birthdayOffer.updateMany({ where: { id: offer.id, status: "PENDING" }, data: { status: "SENDING", attemptedAt: now, error: null } });
  if (claim.count !== 1) return;
  let result;
  try {
    result = await sendEmail({ to: offer.coupon.personalEmail!, ...message });
  } catch {
    await finishDelivery(offer.id, offer.couponId, "UNKNOWN", "Delivery outcome unknown. Check the email provider before any manual send.");
    return;
  }
  if (result.ok && result.mode !== "log") {
    await finishDelivery(offer.id, offer.couponId, "SENT");
  } else if ((result.ok && result.mode === "log") || (!result.ok && result.notAccepted)) {
    if (attempts >= OUTBOX_MAX_ATTEMPTS) {
      await finishDelivery(offer.id, offer.couponId, "FAILED", "Email was not accepted by the provider.");
    } else {
      await prisma.birthdayOffer.update({ where: { id: offer.id }, data: { status: "PENDING", error: "Email was not accepted; queued for retry." } });
    }
    throw new Error("Birthday email was not accepted by the provider");
  } else {
    await finishDelivery(offer.id, offer.couponId, "UNKNOWN", "Delivery outcome unknown. Check the email provider before any manual send.");
  }
}

export async function getBirthdayDashboard() {
  const [settings, groups, redeemed, recent] = await Promise.all([
    getBirthdaySettings(),
    prisma.birthdayOffer.groupBy({ by: ["status"], _count: true }),
    prisma.couponRedemption.count({ where: { status: "CONSUMED", coupon: { birthdayOffer: { isNot: null } } } }),
    prisma.birthdayOffer.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, couponId: true, year: true, status: true, error: true, sentAt: true, createdAt: true, coupon: { select: { code: true } } } }),
  ]);
  const count = (status: string) => groups.find((row) => row.status === status)?._count ?? 0;
  return { settings, summary: { sent: count("SENT"), failed: count("FAILED"), unknown: count("UNKNOWN"), pending: count("PENDING") + count("SENDING"), skipped: count("SKIPPED"), redeemed }, recent };
}
