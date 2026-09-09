import type { LocaleCode } from "@prisma/client";
import { wrapHtml } from "../../lib/email/templates.js";
import en from "./email-copy/en.json";
import pt from "./email-copy/pt.json";
import es from "./email-copy/es.json";
import cs from "./email-copy/cs.json";
import ro from "./email-copy/ro.json";
import de from "./email-copy/de.json";

const COPY = { EN: en, PT: pt, ES: es, CS: cs, RO: ro, DE: de };
const LOCALE_TAGS = { EN: "en-IE", PT: "pt-PT", ES: "es-ES", CS: "cs-CZ", RO: "ro-RO", DE: "de-DE" };

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderBirthdayEmail(input: {
  fullName?: string | null;
  locale: LocaleCode;
  code: string;
  discountPercent: number;
  validUntil: Date;
  timezone: string;
  bookingUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  for (const link of [input.bookingUrl, input.unsubscribeUrl]) {
    if (!["https:", "http:"].includes(new URL(link).protocol)) {
      throw new Error("Birthday email links must use HTTP or HTTPS");
    }
  }
  const locale = Object.hasOwn(COPY, input.locale) ? input.locale : "EN";
  const copy = COPY[locale].birthday;
  const name = input.fullName?.trim().split(/\s+/)[0] ?? "";
  const vars: Record<string, string> = {
    name,
    discountPercent: String(input.discountPercent),
    validUntil: new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      timeZone: input.timezone,
    }).format(input.validUntil),
  };
  const interpolate = (template: string) => template.replace(/\{(\w+)\}/g,
    (match, key: string) => Object.hasOwn(vars, key) ? vars[key] : match);
  const paragraphs = [
    interpolate(name ? copy.greetingNamed : copy.greetingAnon),
    interpolate(copy.discountLine),
    `${copy.codeLabel}: ${input.code}`,
    interpolate(copy.validLine),
    copy.personalLock,
    copy.howTo,
    copy.terms,
  ];
  return {
    subject: interpolate(copy.subject),
    text: [...paragraphs, `${copy.cta}: ${input.bookingUrl}`, copy.signoff,
      `${copy.unsubscribe}: ${input.unsubscribeUrl}`].join("\n\n"),
    html: wrapHtml(copy.title, [
      ...paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`),
      `<p style="margin:24px 0;text-align:center;"><a href="${escapeHtml(input.bookingUrl)}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">${escapeHtml(copy.cta)}</a></p>`,
      `<p>${escapeHtml(copy.signoff)}</p>`,
      `<p style="font-size:12px;color:#737373;"><a href="${escapeHtml(input.unsubscribeUrl)}">${escapeHtml(copy.unsubscribe)}</a></p>`,
    ].join("\n")),
  };
}
