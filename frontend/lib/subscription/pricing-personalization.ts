import type { SubscriptionView } from "@/lib/api/me-subscription";

/**
 * Pure per-visitor logic for the public /pricing page. Lives here rather than
 * inside the client component so it stays unit-testable — `app/**` is outside
 * the vitest include set (see vitest.config.ts).
 *
 * Moved verbatim off the server as part of P-001: /pricing is now statically
 * generated, so "your current plan" and the subscribe CTA are resolved on the
 * client from the same values the server used to read via cookies().
 */

/** Accept only safe in-site relative paths for a post-subscribe return.
 *  The leading-`//` rejection is not cosmetic: `//evil.test` matches the path
 *  charset but browsers read it as a protocol-relative absolute URL, i.e. an
 *  open redirect off-site after payment. */
export function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || value.startsWith("//")) return undefined;
  return /^\/[a-zA-Z0-9/_-]*$/.test(value) ? value : undefined;
}

/**
 * The viewer's subscription, but only when it is live AND belongs to the
 * country being viewed — plans are per-country, so a sub elsewhere must not
 * flag a card as "current" or block a purchase here. PAST_DUE still counts
 * as "current" (they own the plan, they just owe on it).
 */
export function activeSubscriptionFor(
  sub: SubscriptionView | null,
  countryCode: string,
): SubscriptionView | null {
  if (!sub) return null;
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") return null;
  if (sub.countryCode?.toLowerCase() !== countryCode.toLowerCase()) return null;
  return sub;
}

/** Auth-aware subscribe CTA (D15 — no guest). Logged-in patients go straight to
 *  the confirm screen; anonymous visitors are routed to login and resumed back
 *  onto the same subscribe action via `?next`. Country + lang ride along so the
 *  account-area confirm screen can resolve the plan from the right catalogue. */
export function subscribeHref(
  planId: string,
  countryCode: string,
  lang: string,
  isAuthenticated: boolean,
  returnTo?: string,
): string {
  const base = `/account/subscribe?plan=${encodeURIComponent(planId)}&country=${encodeURIComponent(countryCode)}&lang=${encodeURIComponent(lang)}`;
  // `returnTo` (e.g. the cart) rides through so the post-payment Stripe redirect
  // lands back in the checkout funnel with benefits applied (§6c).
  const target = returnTo ? `${base}&returnTo=${encodeURIComponent(returnTo)}` : base;
  return isAuthenticated ? target : `/login?next=${encodeURIComponent(target)}`;
}
