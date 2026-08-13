import { randomUUID } from "node:crypto";

/**
 * A `Currency.code` no other test suite will claim.
 *
 * Fixtures used to build this as `` `M${uniq}`.slice(0, 9) `` where `uniq` was
 * `<prefix>-<Date.now()>-<random>`. Nine characters is not enough to reach the
 * random part: `M` + `mem-1786153473418-k2f9x` truncates to `Mmem-1786`, so the
 * value was really "one letter, a short prefix, and the leading digits of a
 * millisecond clock". Every suite sharing a letter and prefix therefore
 * generated the SAME code — `admin-membership-plans.route.test.ts` and
 * `me-membership.route.test.ts` both produced `Mmem-1786` — and collided on
 * `Currency.code`'s unique index whenever they ran concurrently.
 *
 * The failure was ugly out of proportion to the cause: the losing suite threw
 * in `before()`, so every test in that FILE failed at once, in whichever file
 * happened to lose the race. Across runs it looked like unrelated random
 * flakiness rather than one collision.
 *
 * Randomness first, and enough of it: 8 hex characters is 32 bits, so two
 * suites colliding is not something that happens.
 */
export function uniqueCurrencyCode(): string {
  return `T${randomUUID().replace(/-/g, "").slice(0, 8)}`.toUpperCase();
}
