import { LocaleCode, type NotificationType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl, sendEmail } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { getBalance } from "../credits/credit-balance.service.js";
import { asPlanSnapshot } from "./plan-snapshot.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import enCopy from "./email-copy/en.json";
import ptCopy from "./email-copy/pt.json";
import esCopy from "./email-copy/es.json";
import csCopy from "./email-copy/cs.json";
import roCopy from "./email-copy/ro.json";
import deCopy from "./email-copy/de.json";

/**
 * Patient subscription notification channel (§30). TWO channels, both
 * best-effort: (1) localized email, (2) an in-app `Notification` row for the
 * patient bell/center. The NotificationType enum now carries patient
 * subscription values, and the row's payload stores the already-localized
 * { title, body, href } so the frontend renders it directly. All copy is
 * localized to the subscriber's country default locale. NO failed-payment/
 * dunning notification — Stripe owns that (§38.5).
 *
 * Every dispatcher is fire-and-forget safe: it resolves the recipient, builds
 * the localized message, sends the email + writes the in-app row, and
 * swallows/logs failures so a hiccup never breaks the webhook money path.
 */

type EmailBundle = typeof enCopy;

const COPY: Record<string, EmailBundle> = {
  EN: enCopy,
  PT: ptCopy as EmailBundle,
  ES: esCopy as EmailBundle,
  CS: csCopy as EmailBundle,
  RO: roCopy as EmailBundle,
  DE: deCopy as EmailBundle,
};

const LOCALE_TAG: Record<string, string> = {
  EN: "en-IE",
  PT: "pt-PT",
  ES: "es-ES",
  CS: "cs-CZ",
  RO: "ro-RO",
  DE: "de-DE",
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m,
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: Date, locale: LocaleCode): string {
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "en-IE", { dateStyle: "medium" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

interface Recipient {
  userId: string;
  email: string;
  fullName: string;
  locale: LocaleCode;
  planName: string;
}

/** Resolve recipient + the subscriber's country default locale. */
async function loadRecipient(subscriptionId: string): Promise<Recipient | null> {
  const sub = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      countryCode: true,
      user: { select: { id: true, email: true, fullName: true } },
      plan: { select: { name: true, translations: true } },
    },
  });
  if (!sub?.user?.email) return null;

  let locale: LocaleCode = LocaleCode.EN;
  if (sub.countryCode) {
    const country = await prisma.country.findFirst({
      where: { code: { equals: sub.countryCode, mode: "insensitive" } },
      select: { defaultLocale: true },
    });
    if (country?.defaultLocale) locale = country.defaultLocale;
  }
  const planName = sub.plan
    ? resolveTranslation(sub.plan.translations, locale, locale).tr?.name ?? sub.plan.name
    : "your plan";
  return {
    userId: sub.user.id,
    email: sub.user.email,
    fullName: sub.user.fullName,
    locale,
    planName,
  };
}

/**
 * Write a patient in-app notification row. Best-effort — an in-app failure must
 * never break the webhook/money path (mirrors the email dispatch). The payload
 * carries the already-localized title/body + a relative href for the bell/list.
 */
async function writeInApp(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  href: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { recipientUserId: userId, type, payload: { title, body, href } },
    });
  } catch {
    // swallow — in-app notification is non-critical
  }
}

interface BuiltEmail {
  subject: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
}

/** Render + send. Catches everything — emails never break the caller. */
async function dispatch(to: string, locale: LocaleCode, built: BuiltEmail): Promise<void> {
  const bodyHtml = [
    ...built.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    built.cta
      ? `<p style="margin:24px 0;text-align:center;"><a href="${built.cta.href}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">${escapeHtml(built.cta.label)}</a></p>`
      : "",
  ].join("\n");
  const text = `${built.paragraphs.join("\n\n")}${built.cta ? `\n\n${built.cta.label}: ${built.cta.href}` : ""}`;
  try {
    await sendEmail({ to, subject: built.subject, html: wrapHtml(built.title, bodyHtml), text });
  } catch {
    // Mail failures must never break the webhook/money path.
  }
}

function greetingParagraph(copy: EmailBundle, name: string): string {
  return interpolate(copy.common.greeting, { name });
}

// ── Dispatchers ──────────────────────────────────────────────────────────────

export async function notifySubscriptionConfirmed(subscriptionId: string, credits: number): Promise<void> {
  const r = await loadRecipient(subscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  // Month-1 benefits are withheld under D25 (credits === 0) — never tell the
  // subscriber they have "0 credits"; explain that credits unlock next cycle.
  const creditLine = credits > 0 ? interpolate(c.confirmed.p2, { credits }) : c.confirmed.p2Locked;
  await dispatch(r.email, r.locale, {
    subject: interpolate(c.confirmed.subject, { plan: r.planName }),
    title: interpolate(c.confirmed.title, { plan: r.planName }),
    paragraphs: [greetingParagraph(c, r.fullName), c.confirmed.p1, creditLine, c.common.signoff],
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/plans") },
  });
  await writeInApp(
    r.userId,
    "SUBSCRIPTION_CONFIRMED",
    interpolate(c.confirmed.title, { plan: r.planName }),
    creditLine,
    "/account/plans",
  );
}

export async function notifySubscriptionRenewed(subscriptionId: string, credits: number): Promise<void> {
  const r = await loadRecipient(subscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  // A renewal that still withholds credits (unlock threshold > 2) shows the
  // locked line rather than "we added 0 credits".
  const creditLine = credits > 0 ? interpolate(c.renewed.p2, { credits }) : c.renewed.p2Locked;
  await dispatch(r.email, r.locale, {
    subject: interpolate(c.renewed.subject, { plan: r.planName }),
    title: c.renewed.title,
    paragraphs: [
      greetingParagraph(c, r.fullName),
      interpolate(c.renewed.p1, { plan: r.planName }),
      creditLine,
      c.common.signoff,
    ],
    cta: { label: c.common.dashboardCta, href: absoluteSiteUrl("/account") },
  });
  await writeInApp(r.userId, "SUBSCRIPTION_RENEWED", c.renewed.title, creditLine, "/account");
}

export async function notifyPerkUnlocked(subscriptionId: string, perkKey: string): Promise<void> {
  const r = await loadRecipient(subscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  const perkLabel = (c.perks as Record<string, string>)[perkKey] ?? perkKey;
  // Months threshold is data-driven from the subscriber's snapshot rule.
  const subRow = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
    select: { planSnapshot: true },
  });
  const snapshot = asPlanSnapshot(subRow?.planSnapshot);
  const months = snapshot?.perkRules.find((p) => p.perkKey === perkKey)?.unlockAfterPaidMonths ?? 0;
  // MONTH_1 perks have no month threshold (months < 1) — don't render the
  // nonsensical "available after 0 paid month(s)"; use the immediate variant.
  const p1 =
    months >= 1
      ? interpolate(c.perkUnlocked.p1, { perk: perkLabel, months })
      : interpolate(c.perkUnlocked.p1Now, { perk: perkLabel });
  await dispatch(r.email, r.locale, {
    subject: c.perkUnlocked.subject,
    title: c.perkUnlocked.title,
    paragraphs: [greetingParagraph(c, r.fullName), p1, c.perkUnlocked.p2, c.common.signoff],
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/plans") },
  });
  await writeInApp(
    r.userId,
    "SUBSCRIPTION_PERK_UNLOCKED",
    c.perkUnlocked.title,
    p1,
    "/account/plans",
  );
}

export async function notifyWellnessEarned(subscriptionId: string, credits: number): Promise<void> {
  const r = await loadRecipient(subscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  const balance = await getBalance(subscriptionId, "WELLNESS").catch(() => credits);
  await dispatch(r.email, r.locale, {
    subject: c.wellnessEarned.subject,
    title: c.wellnessEarned.title,
    paragraphs: [
      greetingParagraph(c, r.fullName),
      interpolate(c.wellnessEarned.p1, { credits, balance }),
      c.wellnessEarned.p2,
      c.common.signoff,
    ],
    cta: { label: c.common.rewardsCta, href: absoluteSiteUrl("/account/rewards") },
  });
  await writeInApp(
    r.userId,
    "WELLNESS_CREDITS_EARNED",
    c.wellnessEarned.title,
    interpolate(c.wellnessEarned.p1, { credits, balance }),
    "/account/rewards",
  );
}

export async function notifyRedemptionConfirmed(redemptionId: string): Promise<void> {
  const redemption = await prisma.healthTestRedemption.findUnique({
    where: { id: redemptionId },
    select: {
      userSubscriptionId: true,
      healthTest: { select: { title: true } },
    },
  });
  if (!redemption) return;
  const r = await loadRecipient(redemption.userSubscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  await dispatch(r.email, r.locale, {
    subject: c.redemptionConfirmed.subject,
    title: c.redemptionConfirmed.title,
    paragraphs: [
      greetingParagraph(c, r.fullName),
      interpolate(c.redemptionConfirmed.p1, { kit: redemption.healthTest?.title ?? "your kit" }),
      c.redemptionConfirmed.p2,
      c.common.signoff,
    ],
    cta: { label: c.common.dashboardCta, href: absoluteSiteUrl("/account/orders") },
  });
  await writeInApp(
    r.userId,
    "KIT_REDEMPTION_CONFIRMED",
    c.redemptionConfirmed.title,
    interpolate(c.redemptionConfirmed.p1, { kit: redemption.healthTest?.title ?? "your kit" }),
    "/account/orders",
  );
}

export async function notifyRenewalReminder(subscriptionId: string, renewalDate: Date): Promise<void> {
  const r = await loadRecipient(subscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  await dispatch(r.email, r.locale, {
    subject: c.reminder.subject,
    title: c.reminder.title,
    paragraphs: [
      greetingParagraph(c, r.fullName),
      interpolate(c.reminder.p1, { plan: r.planName, date: formatDate(renewalDate, r.locale) }),
      c.reminder.p2,
      c.common.signoff,
    ],
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/plans") },
  });
  await writeInApp(
    r.userId,
    "SUBSCRIPTION_RENEWAL_REMINDER",
    c.reminder.title,
    interpolate(c.reminder.p1, { plan: r.planName, date: formatDate(renewalDate, r.locale) }),
    "/account/plans",
  );
}

export async function notifySubscriptionCanceled(subscriptionId: string, periodEnd: Date | null): Promise<void> {
  const r = await loadRecipient(subscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  const dateStr = periodEnd ? formatDate(periodEnd, r.locale) : "";
  await dispatch(r.email, r.locale, {
    subject: c.canceled.subject,
    title: c.canceled.title,
    paragraphs: [
      greetingParagraph(c, r.fullName),
      interpolate(c.canceled.p1, { plan: r.planName }),
      interpolate(c.canceled.p2, { date: dateStr }),
      c.common.signoff,
    ],
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/plans") },
  });
  await writeInApp(
    r.userId,
    "SUBSCRIPTION_CANCELED",
    c.canceled.title,
    interpolate(c.canceled.p1, { plan: r.planName }),
    "/account/plans",
  );
}
