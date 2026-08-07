import { BadgeCheck } from "lucide-react";
import { formatAppDate } from "@/lib/format-datetime";
import { interpolate } from "@/lib/subscription/format";
import type { MemberMembershipView } from "@/lib/api/me-memberships";

/**
 * The digital card (§10). Rendered straight from the enrollment — there is no
 * card table and, deliberately, no QR code or public verification URL (§20):
 * staff verify by looking the number up behind an admin session, so putting a
 * scannable public link on the card would build exactly the member directory
 * that decision rules out.
 *
 * Styling is the portal's `lux-*` system, in `portal.css`.
 */
export function MembershipDigitalCard({
  membership,
  t,
}: {
  membership: MemberMembershipView;
  t: Record<string, string>;
}) {
  const validity =
    membership.termState === "NOT_STARTED"
      ? interpolate(t.termStartsOn, { date: formatAppDate(membership.startDate) })
      : membership.endDate
        ? interpolate(
            membership.termState === "ENDED" ? t.termEnded : t.termUntil,
            { date: formatAppDate(membership.endDate) },
          )
        : t.termOpenEnded;

  return (
    <div className="gh-membership-card" data-status={membership.status}>
      <div className="gh-membership-card-top">
        <span className="gh-membership-card-plan">{membership.planName}</span>
        <BadgeCheck className="size-5" aria-hidden />
      </div>

      <p className="gh-membership-card-number">{membership.membershipId}</p>

      <dl className="gh-membership-card-grid">
        <div>
          <dt>{t.cardMember}</dt>
          <dd>{membership.holderName}</dd>
        </div>
        <div>
          <dt>{t.cardPlan}</dt>
          <dd>{membership.levelName}</dd>
        </div>
        <div>
          <dt>{t.cardNumber}</dt>
          <dd>{membership.membershipId}</dd>
        </div>
        <div>
          <dt>{t.cardValid}</dt>
          <dd>{validity}</dd>
        </div>
      </dl>
    </div>
  );
}
