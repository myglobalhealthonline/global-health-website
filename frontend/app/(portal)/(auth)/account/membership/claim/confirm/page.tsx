import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { PageHeader } from "@/components/portal-atoms";
import { MembershipClaimConfirm } from "../../_components/MembershipClaimConfirm";

export const metadata: Metadata = { title: "Confirm your membership", robots: { index: false } };

/**
 * The destination of the confirmation link mailed to the enrolled address
 * (§5.3, step 2).
 *
 * The page renders a button; it does not confirm on load. The token is single
 * use and mail scanners fetch links, so auto-confirming here would let a
 * scanner consume the token before the member ever opened the message.
 */
export default async function MembershipClaimConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ token }, locale] = await Promise.all([searchParams, getPortalLocale()]);
  const { account } = loadLocaleBundle(locale);
  const t = account.privateMembership as unknown as Record<string, string>;

  return (
    <div className="gh-patient-page">
      <PageHeader
        eyebrow={t.title}
        icon={<BadgeCheck aria-hidden />}
        title={t.confirmTitle}
        description={t.confirmBody}
      />
      <div className="max-w-xl">
        <MembershipClaimConfirm token={token ?? null} t={t} />
      </div>
    </div>
  );
}
