import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { PageHeader } from "@/components/portal-atoms";
import { MembershipClaimForm } from "../_components/MembershipClaimForm";

export const metadata: Metadata = { title: "Claim your membership", robots: { index: false } };

/** "My membership isn't listed" — step 1 of the two-step claim (§5.3/§7). */
export default async function MembershipClaimPage() {
  const locale = await getPortalLocale();
  const { account } = loadLocaleBundle(locale);
  const t = account.privateMembership as unknown as Record<string, string>;

  return (
    <div className="gh-patient-page">
      <PageHeader
        eyebrow={t.title}
        icon={<BadgeCheck aria-hidden />}
        title={t.claimTitle}
        description={t.claimSubtitle}
      />
      <div className="max-w-xl">
        <MembershipClaimForm t={t} />
      </div>
    </div>
  );
}
