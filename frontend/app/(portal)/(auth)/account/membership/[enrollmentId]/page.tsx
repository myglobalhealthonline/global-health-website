import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getServerMembership } from "@/lib/api/me-memberships-server";
import { groupBenefitsByCountry } from "@/lib/api/me-memberships";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { formatAppDate } from "@/lib/format-datetime";
import { interpolate } from "@/lib/subscription/format";
import { AdminCard, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import { SetCrumbTitle } from "@/components/crumb-title";
import { MembershipDigitalCard } from "../_components/MembershipDigitalCard";
import { MembershipDependentsPanel } from "../_components/MembershipDependentsPanel";
import { MembershipPrintButton } from "../_components/MembershipPrintButton";
import {
  benefitFallback,
  benefitTarget,
  benefitValue,
} from "../_components/membership-benefit-lines";
import { statusLabel } from "../_components/membership-status";

export const metadata: Metadata = { title: "Membership", robots: { index: false } };

/**
 * One membership: card, term, benefits in plain language, dependents (§10).
 *
 * The API scopes by session, so an id belonging to someone else 404s exactly
 * like one that does not exist — a member cannot probe for other enrollments.
 */
export default async function MembershipDetailPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const [{ enrollmentId }, locale] = await Promise.all([params, getPortalLocale()]);
  const membership = await getServerMembership(enrollmentId);
  if (!membership) notFound();

  const { account } = loadLocaleBundle(locale);
  const t = account.privateMembership as unknown as Record<string, string>;

  return (
    <div className="gh-patient-page">
      {/* Without this the trail bottoms out at the enrollment id, humanised
          into nonsense ("Demo Enrollment Linked"). */}
      <SetCrumbTitle label={membership.planName} />
      <PageHeader
        eyebrow={t.title}
        icon={<BadgeCheck aria-hidden />}
        title={membership.planName}
        description={membership.levelName}
      />

      <div className="gh-membership-detail-top mb-5">
        <MembershipDigitalCard membership={membership} t={t} />

        <AdminCard className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Pill tone={membership.status === "ACTIVE" ? "active" : "neutral"}>
              {statusLabel(membership.status, t)}
            </Pill>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="opacity-70">{t.cardNumber}</dt>
              <dd className="font-medium">{membership.membershipId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="opacity-70">{t.cardValid}</dt>
              <dd className="font-medium">
                {membership.endDate
                  ? interpolate(
                      membership.termState === "ENDED" ? t.termEnded : t.termUntil,
                      { date: formatAppDate(membership.endDate) },
                    )
                  : t.termOpenEnded}
              </dd>
            </div>
          </dl>
          {/* ACTIVE but not yet in term — the one state where the status pill
              alone would mislead (§5.2). */}
          {membership.termState === "NOT_STARTED" ? (
            <p className="text-sm">
              {interpolate(t.notStartedNote, { date: formatAppDate(membership.startDate) })}
            </p>
          ) : null}
          <div className="flex justify-end">
            <MembershipPrintButton label={t.print} />
          </div>
        </AdminCard>
      </div>

      <AdminCard padding={0} className="mb-5">
        <SectionHeader as="h2" title={t.benefitsTitle} />
        <div className="p-5">
          {membership.benefits.length === 0 ? (
            <p className="text-sm opacity-70">{t.benefitsNone}</p>
          ) : (
            /* Grouped by country (§25). Since 7a a level's rows span every
             * covered country, and a flat list puts an Irish discount and a
             * Czech one under one heading with nothing to tell them apart —
             * which is worse than no list, because it reads as a single set of
             * terms that applies everywhere. */
            <div className="flex flex-col gap-5">
              {groupBenefitsByCountry(membership.benefits).map((group) => (
                <div key={group.countryCode}>
                  <h3 className="gh-field-label mb-2">{group.countryName}</h3>
                  <ul className="flex flex-col gap-3">
                    {group.benefits.map((benefit) => {
                      const fallback = benefitFallback(benefit, t);
                      return (
                        <li
                          key={benefit.id}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
                        >
                          <span className="text-sm font-medium">{benefitTarget(benefit, t)}</span>
                          <span className="text-sm">— {benefitValue(benefit, t)}</span>
                          {fallback ? <span className="text-xs opacity-70">{fallback}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                  {/* §43: a dependent on a SHARED pool must never read the
                      allowance as theirs alone — the primary may have spent it. */}
                  {membership.sharesPool && group.benefits.some((b) => b.allowance) ? (
                    <p className="mt-2 text-xs opacity-70">{t.benefitsSharedNote}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      {membership.family && membership.memberType === "PRIMARY" ? (
        <MembershipDependentsPanel
          enrollmentId={membership.id}
          dependents={membership.dependents}
          family={membership.family}
          t={t}
        />
      ) : null}
    </div>
  );
}
