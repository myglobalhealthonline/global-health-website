import { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl, sendEmail } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";
import enCopy from "./email-copy/en.json";
import ptCopy from "./email-copy/pt.json";
import esCopy from "./email-copy/es.json";
import csCopy from "./email-copy/cs.json";
import roCopy from "./email-copy/ro.json";
import deCopy from "./email-copy/de.json";

/**
 * Coupon emails. One template, both kinds — a personal coupon adds the "this
 * code is reserved for you" line, a general one does not.
 *
 * Copy is per-locale JSON with an English fallback, cloned from
 * `memberships/email-copy`. Note that DE has a REAL German bundle here: the
 * older `automation/notification-language.ts` maps DE onto English because no
 * German templates existed there, and that is not the case for this module.
 *
 * Every recipient gets their own `sendEmail` call with a single `to` — no CC,
 * no BCC — so the greeting and the language can differ per person and nobody
 * sees anybody else's address.
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

function bundleFor(locale: LocaleCode | null | undefined): EmailBundle {
  return COPY[locale ?? "EN"] ?? enCopy;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
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

function toPlain(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function button(link: string, label: string): string {
  return `<p style="margin:24px 0;text-align:center;"><a href="${link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">${escapeHtml(label)}</a></p>
  <p style="font-size:13px;color:#737373;">${escapeHtml(link)}</p>`;
}

/** The code itself, rendered big and monospaced so it survives being read aloud. */
function codeBlock(label: string, code: string): string {
  return `<p style="margin:24px 0;text-align:center;">
    <span style="display:block;font-size:13px;color:#737373;margin-bottom:6px;">${escapeHtml(label)}</span>
    <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:26px;letter-spacing:3px;font-weight:700;color:#15382A;background:#F4F7F2;border:1px dashed #15382A;border-radius:10px;padding:12px 22px;">${escapeHtml(code)}</span>
  </p>`;
}

/** Dates are formatted in the recipient's own locale, not the server's. */
const LOCALE_TAGS: Record<string, string> = {
  EN: "en-IE",
  PT: "pt-PT",
  ES: "es-ES",
  CS: "cs-CZ",
  RO: "ro-RO",
  DE: "de-DE",
};

function formatDate(date: Date, locale: LocaleCode): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? "en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Which language to write in, for someone who may have no account at all.
 *
 * 1. what the admin explicitly picked for this recipient — always wins
 * 2. their account's preferred locale
 * 3. their patient profile's country default
 * 4. the admin's currently scoped country default
 * 5. English
 *
 * Same shape as `enrollmentLocale` in the membership renderer.
 */
export async function resolveCouponRecipientLocale(input: {
  email: string;
  explicitLocale?: LocaleCode | null;
  adminCountryCode?: string | null;
}): Promise<LocaleCode> {
  if (input.explicitLocale) return input.explicitLocale;
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { preferredLocale: true },
  });
  if (user?.preferredLocale) return user.preferredLocale;

  // `currentCountryCode` is where the patient is treated now, which is the
  // right one for "what language do they read"; `originCountryCode` is the
  // medical-record folder and can be a country they left years ago.
  const profile = await prisma.patientProfile.findUnique({
    where: { email },
    select: { currentCountryCode: true, countryFolderCode: true },
  });
  const countryCode =
    profile?.currentCountryCode ??
    profile?.countryFolderCode ??
    input.adminCountryCode ??
    null;
  if (countryCode) {
    const country = await prisma.country.findFirst({
      // Country codes are stored lowercase; an exact upper-cased match returns
      // null and would silently fall through to English.
      where: { code: { equals: countryCode.trim().toLowerCase(), mode: "insensitive" } },
      select: { defaultLocale: true },
    });
    if (country?.defaultLocale) return country.defaultLocale;
  }
  return "EN";
}

export type CouponEmailInput = {
  to: string;
  fullName?: string | null;
  locale: LocaleCode;
  code: string;
  discountPercent: number;
  validUntil: Date;
  /** Set for a PERSONAL coupon — renders the "reserved for you" line. */
  personalEmail?: string | null;
};

export async function sendCouponEmail(input: CouponEmailInput) {
  const copy = bundleFor(input.locale).coupon;
  const firstName = input.fullName?.trim().split(/\s+/)[0] ?? "";
  const vars = {
    // Every value here is admin-entered or recipient-supplied, so it is escaped
    // before it reaches the HTML.
    name: escapeHtml(firstName),
    discountPercent: String(input.discountPercent),
    validUntil: escapeHtml(formatDate(input.validUntil, input.locale)),
    email: escapeHtml(input.personalEmail ?? input.to),
  };

  const greeting = interpolate(firstName ? copy.greetingNamed : copy.greetingAnon, vars);
  const intro = input.personalEmail ? copy.personalIntro : copy.generalIntro;
  const link = absoluteSiteUrl("/");

  const paragraphs = [
    greeting,
    intro,
    interpolate(copy.discountLine, vars),
    interpolate(copy.validLine, vars),
    ...(input.personalEmail ? [interpolate(copy.personalLock, vars)] : []),
    copy.howTo,
    copy.shippingNote,
  ];

  return sendEmail({
    to: input.to,
    subject: interpolate(copy.subject, vars),
    text: [
      greeting,
      intro,
      `${copy.codeLabel}: ${input.code}`,
      ...paragraphs.slice(2).map(toPlain),
      link,
      copy.signoff,
      copy.footer,
    ].join("\n\n"),
    html: wrapHtml(
      copy.title,
      [
        `<p>${greeting}</p>`,
        `<p>${intro}</p>`,
        codeBlock(copy.codeLabel, input.code),
        `<p><strong>${interpolate(copy.discountLine, vars)}</strong><br />${interpolate(copy.validLine, vars)}</p>`,
        ...(input.personalEmail ? [`<p>${interpolate(copy.personalLock, vars)}</p>`] : []),
        `<p>${copy.howTo}</p>`,
        button(link, copy.cta),
        `<p style="font-size:13px;color:#737373;">${copy.shippingNote}</p>`,
        `<p>${copy.signoff}</p>`,
        `<p style="font-size:12px;color:#9a9a9a;">${copy.footer}</p>`,
      ].join("\n"),
    ),
  });
}
