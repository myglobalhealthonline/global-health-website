/**
 * One switch that empties every in-memory availability cache.
 *
 * Slot reads are cached in three places with their own TTLs: the per-doctor
 * slot cache here, the aggregated service-availability cache, and the GP
 * quick-book cache. All three read from `doctor-availability.service`, so that
 * module cannot import them back to clear them — hence a registry: each cache
 * registers its own `clear` on import, and any write that changes bookable
 * inventory calls `invalidateAvailabilityCaches()`.
 *
 * Without this, blocking a slot left it on offer to patients for up to the TTL
 * (45s), and the doctor who just blocked it had no way to tell.
 *
 * Coarse on purpose: keys are bucketed by doctor, service and date range, so
 * there is no cheap way to invalidate exactly the entries covering one instant.
 * These are read-through caches — a miss costs a query, never correctness.
 */

type ClearFn = () => void;

const registered = new Set<ClearFn>();

export function registerAvailabilityCache(clear: ClearFn): void {
  registered.add(clear);
}

export function invalidateAvailabilityCaches(): void {
  for (const clear of registered) clear();
}
