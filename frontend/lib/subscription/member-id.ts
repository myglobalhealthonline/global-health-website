/**
 * Display-only membership number for the portal membership card.
 *
 * There is no `memberNumber` column — `SubscriptionView` carries plan,
 * country, status and dates only. Rather than add a schema field and a
 * backfill for something that is currently decorative, the number is
 * derived from the user id: same user → same number, forever, with no
 * storage. If a real, support-quotable member number is ever needed,
 * replace this with the persisted column and keep the format.
 *
 * Format: `GH-1234-5678` (FNV-1a over the id, split into two 4-digit
 * groups). Not an identifier anyone can resolve back to the user id.
 */
export function deriveMemberId(userId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i);
    // FNV prime, kept in 32-bit range via Math.imul.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const digits = String(hash % 100_000_000).padStart(8, "0");
  return `GH-${digits.slice(0, 4)}-${digits.slice(4)}`;
}
