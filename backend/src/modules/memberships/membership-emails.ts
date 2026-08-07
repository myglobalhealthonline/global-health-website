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
 * Membership emails (§12): the manual invite and the enrollment-confirmed
 * notice (phase 2), the claim confirmation (phase 3), and the
 * allowance-exhausted notice (phase 5, with the ledger).
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

/** Money in the plan country's currency, for the fallback-price line. */
async function formatCents(cents: number, countryId: string): Promise<string> {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { currency: { select: { code: true } } },
  });
  const code = country?.currency?.code ?? "EUR";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: code }).format(cents / 100);
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

/**
 * Allowance exhausted (§12.3) — sent when a spend takes a counter to zero.
 *
 * Fired by checkout AFTER its transaction commits, and deduped there per
 * (enrollment, benefit): a cart whose two lines empty the same counter is one
 * event, not two. Sending from inside the transaction would mail the member
 * even when the checkout rolled back.
 *
 * The whole point is to say what happens NEXT time, because that is the part
 * the member cannot see: the benefit row's fallback discount, or the standard
 * price. Resolved from the row itself rather than described generically.
 */
export async function sendMembershipAllowanceExhaustedEmail(opts: {
  enrollmentId: string;
  benefitId: string;
}) {
  const enrollment = await prisma.membershipEnrollment.findUnique({
    where: { id: opts.enrollmentId },
    select: {
      firstName: true,
      email: true,
      countryId: true,
      plan: { select: { name: true } },
      level: { select: { name: true } },
      user: { select: { email: true, preferredLocale: true } },
    },
  });
  if (!enrollment) return null;
  const benefit = await prisma.membershipBenefit.findUnique({
    where: { id: opts.benefitId },
    select: {
      allowanceCount: true,
      fallbackType: true,
      fallbackPercent: true,
      fallbackFixedCents: true,
    },
  });
  if (!benefit) return null;

  const locale = enrollment.user?.preferredLocale ?? (await countryDefaultLocale(enrollment.countryId));
  const copy = bundleFor(locale).exhausted;
  const to = enrollment.user?.email ?? enrollment.email;

  const vars = {
    firstName: escapeHtml(enrollment.firstName),
    planName: escapeHtml(enrollment.plan.name),
    levelName: escapeHtml(enrollment.level.name),
    allocated: String(benefit.allowanceCount ?? 0),
    fallbackPercent: String(benefit.fallbackPercent ?? 0),
    fallbackPrice: escapeHtml(
      await formatCents(benefit.fallbackFixedCents ?? 0, enrollment.countryId),
    ),
  };
  const onwards =
    benefit.fallbackType === "PERCENT"
      ? copy.onwardsPercent
      : benefit.fallbackType === "FIXED"
        ? copy.onwardsFixed
        : copy.onwardsNone;
  const link = absoluteSiteUrl("/account/membership");
  const lines = [copy.lead, onwards, copy.action].map((line) => interpolate(line, vars));

  return sendEmail({
    to,
    subject: interpolate(copy.subject, { ...vars, planName: enrollment.plan.name }),
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
 * Claim confirmation (§12.4) — step 1 of the two-step claim (§5.3).
 *
 * Sent to the **enrolled** address, never to the requester's. That is the
 * whole security property: matching an id + email proves nothing about who is
 * asking, so the enrollment only moves once someone who can read the enrolled
 * mailbox opens this link. The copy names the requester so a recipient who did
 * not ask can recognise a claim attempt on their membership.
 *
 * Locale: the plan country's `defaultLocale`, English fallback — the enrolled
 * person is `PENDING`, has no `User`, and so has no `preferredLocale`. Using
 * the *requester's* locale here would be wrong twice over: it leaks a
 * preference of theirs and writes to a stranger in the wrong language.
 */
export async function sendMembershipClaimConfirmationEmail(opts: {
  /** The ENROLLED address. Never pass the session user's. */
  to: string;
  firstName: string;
  planName: string;
  levelName: string;
  membershipId: string;
  countryId: string;
  /** Shown in the body so an unexpected claim is recognisable. */
  requesterEmail: string;
  /** Raw token — only ever in this mail, never persisted (§5.3). */
  token: string;
}) {
  const locale = await countryDefaultLocale(opts.countryId);
  const copy = bundleFor(locale).claim;
  const vars = {
    firstName: escapeHtml(opts.firstName),
    planName: escapeHtml(opts.planName),
    levelName: escapeHtml(opts.levelName),
    membershipId: escapeHtml(opts.membershipId),
    email: escapeHtml(opts.to),
    requesterEmail: escapeHtml(opts.requesterEmail),
  };
  const link = absoluteSiteUrl(
    `/account/membership/claim/confirm?token=${encodeURIComponent(opts.token)}`,
  );
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
