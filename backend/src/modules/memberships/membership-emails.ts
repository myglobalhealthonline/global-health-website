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
 * Membership emails (§12), phase 2: the manual invite and the
 * enrollment-confirmed notice. The allowance-exhausted mail ships with the
 * ledger in phase 5.
 *
 * Both go through `wrapHtml` (the Clinical Editorial shell) and `sendEmail`, so
 * the outbox, retries and the test capture hook behave exactly as everywhere
 * else. Copy is per-locale JSON with an English fallback, mirroring
 * `subscriptions/email-copy` — the pattern already proven in this codebase.
 *
 * Locale resolution (§12): a `PENDING` enrollment has no `User`, so the invite
 * uses the plan country's `defaultLocale`. The confirmation goes to a linked
 * account, so it prefers `User.preferredLocale`, then the country default, then
 * English.
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

/** Strip the tags the copy embeds, for the text/plain alternative. */
function toPlain(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function button(link: string, label: string): string {
  return `<p style="margin:24px 0;text-align:center;"><a href="${link}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">${escapeHtml(label)}</a></p>
  <p style="font-size:13px;color:#737373;">${escapeHtml(link)}</p>`;
}

async function countryDefaultLocale(countryId: string): Promise<LocaleCode> {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { defaultLocale: true },
  });
  return country?.defaultLocale ?? LocaleCode.EN;
}

function bundleFor(locale: LocaleCode | string | null | undefined): EmailBundle {
  return COPY[String(locale ?? "").toUpperCase()] ?? COPY.EN;
}

/**
 * Manual invite (§12.2). There is no token: linking is by verified email, so
 * the link is the ordinary login page. That is also why the copy is explicit
 * about *which* address to use — a member who registers with a different one
 * gets no benefits and no error, and the mail is the only place that can say so.
 */
export async function sendMembershipInviteEmail(opts: {
  to: string;
  firstName: string;
  planName: string;
  levelName: string;
  membershipId: string;
  countryId: string;
}) {
  const locale = await countryDefaultLocale(opts.countryId);
  const copy = bundleFor(locale).invite;
  const vars = {
    firstName: escapeHtml(opts.firstName),
    planName: escapeHtml(opts.planName),
    levelName: escapeHtml(opts.levelName),
    membershipId: escapeHtml(opts.membershipId),
    email: escapeHtml(opts.to),
  };
  const link = absoluteSiteUrl("/login");
  const lines = [copy.lead, copy.idLine, copy.action, copy.note].map((line) =>
    interpolate(line, vars),
  );

  return sendEmail({
    to: opts.to,
    subject: interpolate(copy.subject, { ...vars, planName: opts.planName }),
    text: [interpolate(copy.greeting, vars), ...lines.map(toPlain), link, copy.signoff].join("\n\n"),
    html: wrapHtml(
      interpolate(copy.heading, vars),
      `<p>${interpolate(copy.greeting, vars)}</p>
       ${lines.map((line) => `<p>${line}</p>`).join("\n       ")}
       ${button(link, copy.cta)}`,
    ),
  });
}

/**
 * Enrollment confirmed (§12.1) — sent once, by the linker, the moment an
 * enrollment attaches to an account. "Once" is guaranteed by the linker's own
 * query (a linked row is never returned again), not by a flag here.
 */
export async function sendMembershipEnrollmentConfirmedEmail(opts: {
  to: string;
  firstName: string;
  planName: string;
  levelName: string;
  membershipId: string;
  countryId: string;
  preferredLocale?: LocaleCode | null;
}) {
  const locale = opts.preferredLocale ?? (await countryDefaultLocale(opts.countryId));
  const copy = bundleFor(locale).confirmed;
  const vars = {
    firstName: escapeHtml(opts.firstName),
    planName: escapeHtml(opts.planName),
    levelName: escapeHtml(opts.levelName),
    membershipId: escapeHtml(opts.membershipId),
    email: escapeHtml(opts.to),
  };
  const link = absoluteSiteUrl("/account/membership");
  const lines = [copy.lead, copy.idLine, copy.action].map((line) => interpolate(line, vars));

  return sendEmail({
    to: opts.to,
    subject: interpolate(copy.subject, { ...vars, planName: opts.planName }),
    text: [interpolate(copy.greeting, vars), ...lines.map(toPlain), link, copy.signoff].join("\n\n"),
    html: wrapHtml(
      interpolate(copy.heading, vars),
      `<p>${interpolate(copy.greeting, vars)}</p>
       ${lines.map((line) => `<p>${line}</p>`).join("\n       ")}
       ${button(link, copy.cta)}`,
    ),
  });
}
