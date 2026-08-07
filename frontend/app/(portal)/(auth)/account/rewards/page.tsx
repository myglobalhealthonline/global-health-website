import { redirect } from "next/navigation";

/**
 * Membership and Rewards were merged into one tabbed page (owner request:
 * "why don't we merge it in tabs") — this route now just preserves the old
 * URL/bookmarks/links by forwarding to the rewards tab.
 */
export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ redemption?: string }>;
}) {
  const { redemption } = await searchParams;
  const qs = redemption ? `&redemption=${encodeURIComponent(redemption)}` : "";
  redirect(`/account/plans?tab=rewards${qs}`);
}
