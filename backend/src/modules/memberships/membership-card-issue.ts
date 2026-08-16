import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { membershipCardCopy, sendMembershipWelcomeCardEmail } from "./membership-emails.js";
import {
  buildCardContentFromRow,
  cardContentSelect,
  cardStatusLabel,
  resolveCardLocale,
} from "./membership-card-content.js";
import { membershipCardFilename, renderMembershipCardPng } from "./membership-card-image.js";

/**
 * Issue a membership card: build it, mail it with the card image attached, stamp
 * `cardIssuedAt` (decisions 41 + 43, §25).
 *
 * **`cardIssuedAt` is the whole dedupe.** A re-import must email nobody twice,
 * and a revive deliberately keeps the column set (§25), so a returning member
 * who already holds a card gets no second one. Everything that wants to send a
 * card goes through here rather than calling the email directly — otherwise the
 * dedupe is only as good as the newest caller's memory of it.
 */

export type CardIssueResult =
  | { issued: true; to: string }
  | { issued: false; reason: "not-found" | "already-issued" | "removed" | "send-failed" };

/**
 * @param force Re-issue a card that has already gone out — the §26 resend. The
 * route and button are 7e; the flag ships here so 7e is only a route, and so
 * that the window between them is not one where no card can be re-issued at
 * all (a revive keeps `cardIssuedAt`, so there is otherwise no escape hatch
 * after a level is recoloured or renamed).
 */
export async function issueMembershipCard(opts: {
  enrollmentId: string;
  force?: boolean;
  actorAdminId?: string | null;
}): Promise<CardIssueResult> {
  const row = await prisma.membershipEnrollment.findUnique({
    where: { id: opts.enrollmentId },
    select: cardContentSelect,
  });
  if (!row) return { issued: false, reason: "not-found" };
  if (row.status === "REMOVED") return { issued: false, reason: "removed" };
  if (row.cardIssuedAt && !opts.force) return { issued: false, reason: "already-issued" };

  // Locale first, copy second, content third. The locale is a property of the
  // row alone (§25's precedence), so it can be resolved without copy — which is
  // what stops this needing to build the content twice to find out which
  // language to build it in.
  const copy = membershipCardCopy(resolveCardLocale(row));
  const content = buildCardContentFromRow(row, copy);

  const image = await renderMembershipCardPng(content, copy, cardStatusLabel(content, copy));
  const to = content.accountEmail ?? content.email;

  const result = await sendMembershipWelcomeCardEmail({
    content,
    to,
    attachment: {
      filename: membershipCardFilename(content.membershipId),
      content: image,
      contentType: "image/png",
    },
  }).catch(() => ({ ok: false as const }));

  // Stamp only on a successful send. Stamping first would be safer against a
  // double send, but it would also permanently mark a member as carded when the
  // mail never left — and the dedupe then blocks every retry, so they would
  // never get a card at all. A crash between the send and the stamp costs one
  // duplicate email; the other way costs a member their card silently.
  if (result.ok === false) return { issued: false, reason: "send-failed" };

  await prisma.membershipEnrollment.update({
    where: { id: opts.enrollmentId },
    // `cardIssuedAt` keeps its FIRST value across a forced re-issue: it answers
    // "does this person have a card", not "when was the last copy sent". The
    // audit row below is the per-send trail.
    data: { cardIssuedAt: row.cardIssuedAt ?? new Date() },
  });

  await recordAudit({
    action: "MEMBERSHIP_CARD_ISSUED",
    entityType: "MembershipEnrollment",
    entityId: opts.enrollmentId,
    actorUserId: opts.actorAdminId ?? null,
    metadata: {
      membershipId: content.membershipId,
      locale: content.locale,
      countries: content.countryCodes,
      reissue: Boolean(row.cardIssuedAt),
    },
  }).catch(() => undefined);

  return { issued: true, to };
}

/**
 * Issue for a batch, sequentially.
 *
 * Sequential on purpose: every card is a Chromium page render, and firing a
 * 2,000-row import at the shared browser in parallel is how that singleton
 * falls over. An import commit is already an admin-initiated background-ish
 * action, so latency is the cheap thing to spend here.
 *
 * A failure never aborts the batch — one member's bad address must not cost the
 * other 1,999 their cards.
 */
export async function issueMembershipCards(
  enrollmentIds: string[],
  actorAdminId: string | null,
): Promise<{ issued: number; skipped: number }> {
  let issued = 0;
  let skipped = 0;
  for (const enrollmentId of enrollmentIds) {
    const result = await issueMembershipCard({ enrollmentId, actorAdminId }).catch(() => ({
      issued: false as const,
      reason: "send-failed" as const,
    }));
    if (result.issued) issued += 1;
    else skipped += 1;
  }
  return { issued, skipped };
}
