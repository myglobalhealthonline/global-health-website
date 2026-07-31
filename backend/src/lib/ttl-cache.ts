/**
 * Minimal in-process bounded TTL cache used by the various read-through
 * caches (doctor slot availability, GP quick-book, aggregated service
 * availability). Expired entries are deleted the moment a read finds them
 * stale — not just ignored — and once the map hits `maxEntries` the oldest
 * key (a `Map` preserves insertion order) is evicted before the new one is
 * inserted, so a long-lived process can't accumulate keys forever.
 *
 * ponytail: this is a size-capped Map, not a real LRU (eviction is by
 * insertion order, not last-access order) and it's single-process/in-memory
 * only — every value here is re-derivable from the DB (read-through cache),
 * so a miss on another replica or after eviction just costs a query, never
 * a correctness bug. Reach for Redis only if cross-replica coherency
 * becomes an actual requirement.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { expires: number; value: V }>();

  constructor(private readonly maxEntries: number) {}

  get size(): number {
    return this.store.size;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Drop every entry. For writes whose effect must be visible immediately
   * rather than after the TTL — e.g. an admin removing a slot from inventory,
   * where a stale listing would offer a slot that no longer exists (and cannot
   * be re-created, unlike a taken slot which simply fails to claim). Coarse on
   * purpose: keys are bucketed by date range, so there's no cheap way to
   * invalidate exactly the ranges containing one instant.
   */
  clear(): void {
    this.store.clear();
  }

  set(key: string, value: V, ttlMs: number): void {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { expires: Date.now() + ttlMs, value });
  }
}
