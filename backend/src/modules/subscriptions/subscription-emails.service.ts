import { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl, sendEmail } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { getBalance } from "../credits/credit-balance.service.js";
import { asPlanSnapshot } from "./plan-snapshot.js";
import enCopy from "./email-copy/en.json";
import ptCopy from "./email-copy/pt.json";
import esCopy from "./email-copy/es.json";
import csCopy from "./email-copy/cs.json";
import roCopy from "./email-copy/ro.json";
import deCopy from "./email-copy/de.json";

/**
 * Patient subscription notification channel (§30). Email is the patient
 * channel — the in-app `Notification` model is doctor-only and its
 * `NotificationType` enum is frozen (no patient values), so we don't write
 * in-app rows here. All copy is localized to the subscriber's country default
 * locale across every active locale. NO failed-payment/dunning email — Stripe
 * owns that (§38.5).
 *
 * Every dispatcher is fire-and-forget safe: it resolves the recipient, builds
 * the localized message, sends it, and swallows/logs failures so a mail hiccup
 * never breaks the webhook money path.
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
      user: { select: { email: true, fullName: true } },
      plan: { select: { name: true } },
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
  return {
    email: sub.user.email,
    fullName: sub.user.fullName,
    locale,
    planName: sub.plan?.name ?? "your plan",
  };
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
      ? `<p style="margin:24px 0;"><a href="${built.cta.href}" style="background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">${escapeHtml(built.cta.label)}</a></p>`
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
  await dispatch(r.email, r.locale, {
    subject: interpolate(c.confirmed.subject, { plan: r.planName }),
    title: interpolate(c.confirmed.title, { plan: r.planName }),
    paragraphs: [
      greetingParagraph(c, r.fullName),
      c.confirmed.p1,
      interpolate(c.confirmed.p2, { credits }),
      c.common.signoff,
    ],
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/membership") },
  });
}

export async function notifySubscriptionRenewed(subscriptionId: string, credits: number): Promise<void> {
  const r = await loadRecipient(subscriptionId);
  if (!r) return;
  const c = COPY[r.locale] ?? COPY.EN;
  await dispatch(r.email, r.locale, {
    subject: interpolate(c.renewed.subject, { plan: r.planName }),
    title: c.renewed.title,
    paragraphs: [
      greetingParagraph(c, r.fullName),
      interpolate(c.renewed.p1, { plan: r.planName }),
      interpolate(c.renewed.p2, { credits }),
      c.common.signoff,
    ],
    cta: { label: c.common.dashboardCta, href: absoluteSiteUrl("/account") },
  });
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
  await dispatch(r.email, r.locale, {
    subject: c.perkUnlocked.subject,
    title: c.perkUnlocked.title,
    paragraphs: [
      greetingParagraph(c, r.fullName),
      interpolate(c.perkUnlocked.p1, { perk: perkLabel, months }),
      c.perkUnlocked.p2,
      c.common.signoff,
    ],
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/membership") },
  });
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
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/membership") },
  });
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
    cta: { label: c.common.manageCta, href: absoluteSiteUrl("/account/membership") },
  });
}
