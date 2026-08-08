import { formatAppDate } from "@/lib/format-datetime";
import { interpolate } from "@/lib/subscription/format";
import type { MemberMembershipView } from "@/lib/api/me-memberships";
import { MembershipCard } from "../../_components/MembershipCard";

/**
 * The private-membership card (§10, §24.1) — now a VARIANT of the public-plan
 * card rather than its own component, so both card types read as one family.
 *
 * Everything visual lives in `MembershipCard` and `portal.css`; this file only
 * turns an enrollment into the pre-formatted strings that component takes.
 *
 * Still deliberately no QR code and no public verification URL (§20): staff
 * verify by looking the number up behind an admin session, and a scannable
 * public link would build exactly the member directory that decision rules out.
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
        ? interpolate(membership.termState === "ENDED" ? t.termEnded : t.termUntil, {
            date: formatAppDate(membership.endDate),
          })
        : t.termOpenEnded;

  // ISO-2 codes, primary first (§24.1). The footer slot already ellipsises, so
  // a plan covering eight countries degrades rather than breaking the layout.
  // Falls back to the primary country when a plan has no configured country at
  // all — a card with an empty "covered in" row reads as broken, and the
  // enrollment's own country is at least true.
  const countries = membership.countryCodes.length
    ? membership.countryCodes.join(" · ")
    : membership.countryCode.toUpperCase();

  const footnote =
    membership.memberType === "DEPENDENT" && membership.primaryMembershipId
      ? interpolate(t.cardFamilyOf, { membershipId: membership.primaryMembershipId })
      : null;

  return (
    <MembershipCard
      planName={membership.planName}
      cardholderName={membership.holderName}
      memberId={membership.membershipId}
      validThrough={validity}
      countryName={countries}
      status={membership.status}
      statusLabel={t[`status${membership.status}`] ?? membership.status}
      labels={{
        cardholder: t.cardMember,
        memberId: t.cardNumber,
        validThrough: t.cardValid,
        motto: t.cardMotto,
      }}
      palette={membership.cardPalette}
      footnote={footnote}
    />
  );
}
