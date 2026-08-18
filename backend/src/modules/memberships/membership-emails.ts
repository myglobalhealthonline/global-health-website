import { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl, sendEmail, type SendEmailAttachment } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";
import {
  cardStatusLabel,
  pickPlanIntro,
  resolveCardLocale,
  type CardCopy,
  type MembershipCardContent,
} from "./membership-card-content.js";
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
 * Locale resolution (§12/§25): every template resolves from the ENROLLMENT via
 * `enrollmentLocale` — linked `User.preferredLocale`, then the enrollment's own
 * `preferredLocale` (what the admin form / import CSV set), then the plan's
 * primary-country default, then English. Reading the country default directly
 * is the bug this replaced: it wrote to a Czech partner's Irish members in Czech.
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

/**
 * The programme's own opening note, as the FIRST paragraph of the mail.
 *
 * Admin-entered free text (the plan translation's `description`), so it is
 * escaped and its line breaks are the only markup it gets - a partner note is
 * never a place to let HTML through.
 *
 * Left blank the whole block disappears and the mail is byte-for-byte the
 * standard one. That is the point: one optional field covers "explain why you
 * are getting this card" for any programme, without a per-programme template.
 */
function introHtml(intro: string | null): string {
  if (!intro) return "";
  const html = intro
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join("<br />");
  return `<p>${html}</p>`;
}

/** The same note for the text/plain alternative. */
function introText(intro: string | null): string[] {
  return intro ? [intro] : [];
}

/**
 * The locale for ANY membership email, resolved from the enrollment itself.
 *
 * Precedence is `resolveCardLocale`'s (§25) and deliberately not re-implemented
 * here: linked account's own preference → the enrollment's stored language (the
 * admin form / CSV `locale` column) → the plan's primary-country default →
 * English. Every template goes through this, because reading the country
 * default alone silently ignored the language an admin set on the member.
 */
async function enrollmentContext(
  enrollmentId: string,
): Promise<{ locale: LocaleCode; intro: string | null }> {
  const row = await prisma.membershipEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      preferredLocale: true,
      user: { select: { preferredLocale: true } },
      plan: {
        select: {
          primaryCountry: { select: { defaultLocale: true } },
          translations: { select: { locale: true, description: true } },
        },
      },
    },
  });
  if (!row) return { locale: LocaleCode.EN, intro: null };
  const locale = resolveCardLocale(row);
  return { locale, intro: pickPlanIntro(row.plan.translations, locale) };
}

function bundleFor(locale: LocaleCode | string | null | undefined): EmailBundle {
  return COPY[String(locale ?? "").toUpperCase()] ?? COPY.EN;
}

/**
 * The card-and-status strings for one locale (§24). Exported because the card
 * builder, the card image and this file must all read the SAME copy — a second bundle
 * would be exactly the drift §24.3's "one shared builder" exists to prevent.
 */
export function membershipCardCopy(locale: LocaleCode): CardCopy {
  return bundleFor(locale).card;
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
  enrollmentId: string;
}) {
  const { locale, intro } = await enrollmentContext(opts.enrollmentId);
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
    text: [
      interpolate(copy.greeting, vars),
      ...introText(intro),
      ...lines.map(toPlain),
      link,
      copy.signoff,
    ].join("\n\n"),
    html: wrapHtml(
      interpolate(copy.heading, vars),
      `<p>${interpolate(copy.greeting, vars)}</p>
       ${introHtml(intro)}
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
  enrollmentId: string;
}) {
  const { locale } = await enrollmentContext(opts.enrollmentId);
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

  const { locale } = await enrollmentContext(opts.enrollmentId);
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
 * Locale: the ENROLLMENT's, never the requester's — using the requester's would
 * be wrong twice over: it leaks a preference of theirs and writes to a stranger
 * in the wrong language.
 */
export async function sendMembershipClaimConfirmationEmail(opts: {
  /** The ENROLLED address. Never pass the session user's. */
  to: string;
  firstName: string;
  planName: string;
  levelName: string;
  membershipId: string;
  enrollmentId: string;
  /** Shown in the body so an unexpected claim is recognisable. */
  requesterEmail: string;
  /** Raw token — only ever in this mail, never persisted (§5.3). */
  token: string;
}) {
  const { locale } = await enrollmentContext(opts.enrollmentId);
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

/**
 * Welcome + card (§25) — the fifth template, and the only one with an
 * attachment.
 *
 * Everything it says about the membership comes from `MembershipCardContent`,
 * the same builder the web card and the card image read (§24.3), so the card in the
 * attachment and the benefits in the body cannot disagree.
 *
 * Three things here are load-bearing and easy to undo by accident:
 *
 * - **Benefits are grouped by country.** Since 7a an enrollment's rows span
 *   every configured country, and a flat list would silently mix an Irish
 *   discount with a Czech one under a single heading.
 * - **The terms line.** Without it the email becomes the contract, and a
 *   partner changing a country's benefits next month leaves every member
 *   holding a written promise of the old ones.
 * - **The shared-pool note (§43).** A dependent on a SHARED level must never be
 *   told "you have 6 visits" — the pool belongs to the primary and may already
 *   be spent. `content.sharesPool` is already conditioned on the level's pool
 *   mode, so a PER_PERSON dependent still gets the ordinary count.
 */
export async function sendMembershipWelcomeCardEmail(opts: {
  content: MembershipCardContent;
  /** The card PNG. Built by the caller so this file never touches Chromium. */
  attachment: SendEmailAttachment;
  /** Where to send. The linked account's address wins over the enrolled one. */
  to?: string;
}) {
  const { content } = opts;
  const bundle = bundleFor(content.locale);
  const copy = bundle.welcome;
  const cardCopy: CardCopy = bundle.card;

  const vars = {
    firstName: escapeHtml(content.firstName),
    planName: escapeHtml(content.planName),
    levelName: escapeHtml(content.levelName),
    membershipId: escapeHtml(content.membershipId),
    primaryMembershipId: escapeHtml(content.primaryMembershipId ?? ""),
    status: escapeHtml(cardStatusLabel(content, cardCopy)),
  };

  // A dependent's own id is `<primary>-D1`, so the family link is already
  // visible in the number — the copy names it rather than leaving the member to
  // infer why their id has a suffix.
  const idLine =
    content.memberType === "DEPENDENT" && content.primaryMembershipId
      ? copy.dependentIdLine
      : copy.idLine;

  const benefitsHtml = content.benefitsByCountry
    .map(
      (group) =>
        `<p style="margin:18px 0 6px;font-weight:700;">${escapeHtml(group.countryName)}</p>
       <ul style="margin:0;padding-left:20px;">${group.lines
         .map((line) => `<li style="margin:4px 0;">${escapeHtml(line.text)}</li>`)
         .join("")}</ul>`,
    )
    .join("\n       ");

  const benefitsText = content.benefitsByCountry
    .map(
      (group) =>
        `${group.countryName}\n${group.lines.map((line) => `  - ${line.text}`).join("\n")}`,
    )
    .join("\n\n");

  const link = absoluteSiteUrl("/account/membership");
  const leadLines = [copy.lead, idLine].map((line) => interpolate(line, vars));
  const tailLines = [
    ...(content.sharesPool ? [copy.sharedNote] : []),
    copy.termsLine,
    copy.action,
  ].map((line) => interpolate(line, vars));

  return sendEmail({
    to: opts.to ?? content.email,
    subject: interpolate(copy.subject, { ...vars, planName: content.planName }),
    text: [
      interpolate(copy.greeting, vars),
      ...introText(content.intro),
      ...leadLines.map(toPlain),
      copy.benefitsHeading,
      benefitsText,
      ...tailLines.map(toPlain),
      link,
      copy.signoff,
    ].join("\n\n"),
    html: wrapHtml(
      interpolate(copy.heading, vars),
      `<p>${interpolate(copy.greeting, vars)}</p>
       ${introHtml(content.intro)}
       ${leadLines.map((line) => `<p>${line}</p>`).join("\n       ")}
       <h3 style="margin:26px 0 0;font-size:16px;">${escapeHtml(copy.benefitsHeading)}</h3>
       ${benefitsHtml}
       ${tailLines.map((line) => `<p>${line}</p>`).join("\n       ")}
       ${button(link, copy.cta)}`,
    ),
    attachments: [opts.attachment],
  });
}
