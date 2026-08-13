import type { MembershipStatus } from "@/lib/api/me-memberships";

const KEYS: Record<MembershipStatus, string> = {
  PENDING: "statusPending",
  ACTIVE: "statusActive",
  SUSPENDED: "statusSuspended",
  EXPIRED: "statusExpired",
  // REMOVED rows are filtered out server-side and never reach the member UI;
  // mapped anyway so a future leak renders a word rather than an enum.
  REMOVED: "statusExpired",
};

export function statusLabel(status: MembershipStatus, t: Record<string, string>): string {
  return t[KEYS[status]] ?? status;
}
