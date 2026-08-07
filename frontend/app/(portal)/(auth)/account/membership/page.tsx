import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { getServerMemberships } from "@/lib/api/me-memberships-server";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { formatAppDate } from "@/lib/format-datetime";
import { interpolate } from "@/lib/subscription/format";
import { AdminCard, AdminEmptyState, PageHeader, Pill } from "@/components/portal-atoms";
import { MembershipDigitalCard } from "./_components/MembershipDigitalCard";
import { statusLabel } from "./_components/membership-status";

export const metadata: Metadata = { title: "Membership", robots: { index: false } };

/**
 * Private membership plans — member landing (§10).
 *
 * This route used to be the public subscription page; that moved to
 * /account/plans, so the empty state points there. Old bookmarks land here,
 * and "no membership" is exactly what a subscriber arriving by bookmark sees.
 */
export default async function MembershipPage() {
  const [memberships, locale] = await Promise.all([getServerMemberships(), getPortalLocale()]);
  const { account } = loadLocaleBundle(locale);
  const t = account.privateMembership as unknown as Record<string, string>;

  const rows = memberships ?? [];
  const [plansHintBefore, plansHintAfter = ""] = t.emptyPlansHint.split("{link}");

  return (
    <div className="gh-patient-page">
      <PageHeader
        eyebrow={t.title}
        icon={<BadgeCheck aria-hidden />}
        title={t.title}
        description={t.subtitle}
      />

      {rows.length === 0 ? (
        <div className="gh-patient-empty-state gh-card max-w-xl p-8">
          <AdminEmptyState
            title={t.emptyTitle}
            description={t.emptyBody}
            action={
              <Link
                href="/account/membership/claim"
                className="gh-btn gh-btn-primary inline-flex justify-center"
              >
                {t.claimCta}
              </Link>
            }
          />
          {/* Old /account/membership bookmarks used to be the subscription
              page, so say where it went rather than leave a subscriber staring
              at "no membership". */}
          <p className="mt-4 text-sm opacity-70">
            {plansHintBefore}
            <Link href="/account/plans" className="underline">
              {t.plansLink}
            </Link>
            {plansHintAfter}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {rows.map((membership) => (
            <AdminCard key={membership.id} padding={0}>
              <div className="gh-membership-summary">
                <MembershipDigitalCard membership={membership} t={t} />
                <div className="flex flex-col gap-2 p-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">{membership.planName}</h2>
                    <Pill tone={membership.status === "ACTIVE" ? "active" : "neutral"}>
                      {statusLabel(membership.status, t)}
                    </Pill>
                  </div>
                  <p className="text-sm opacity-70">{membership.levelName}</p>
                  {/* A future start date is the one case where ACTIVE does not
                      mean "usable" (§5.2) — say so, rather than let the pill
                      imply otherwise. */}
                  {membership.termState === "NOT_STARTED" ? (
                    <p className="text-sm">
                      {interpolate(t.notStartedNote, {
                        date: formatAppDate(membership.startDate),
                      })}
                    </p>
                  ) : null}
                  <Link
                    href={`/account/membership/${membership.id}`}
                    className="mt-2 inline-flex text-sm font-semibold underline"
                    style={{ color: "var(--portal-primary)" }}
                  >
                    {t.viewMembership}
                  </Link>
                </div>
              </div>
            </AdminCard>
          ))}

          <p className="text-sm">
            <Link href="/account/membership/claim" className="underline">
              {t.claimCta}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
