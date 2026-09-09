import type { AvailabilityCacheInvalidation } from "../modules/doctor-availability/availability-cache-bus.js";

export type AvailabilityCacheDependencies = {
  countryCode: string;
  serviceIds?: readonly string[];
  requestServiceId?: string;
  doctorIds?: readonly string[];
  /** Unknown membership conservatively matches invalidations during lookup. */
  pendingDoctors?: boolean;
  pendingServices?: boolean;
};
export type UpdateAvailabilityDependencies = (dependencies: Partial<AvailabilityCacheDependencies>) => void;
type Entry<V> = {
  dependencies: AvailabilityCacheDependencies;
  request: Promise<V>;
  expires: number;
  invalidated: boolean;
};

/** Values, pending reads and dependency metadata share one bounded lifetime. */
export class AvailabilityDependencyCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private revision = 0;
  constructor(private readonly maxEntries: number, private readonly ttlMs: number) {}
  get size(): number { return this.entries.size; }

  invalidate(scope?: AvailabilityCacheInvalidation): void {
    this.revision += 1;
    const doctors = new Set(scope?.doctorIds ?? []);
    const services = new Set(scope?.serviceIds ?? []);
    const countries = new Set(scope?.countryCodes?.map((code) => code.trim().toLowerCase()) ?? []);
    for (const [key, entry] of this.entries) {
      const deps = entry.dependencies;
      if (!scope
        || countries.has(deps.countryCode)
        || (services.size > 0 && (deps.pendingServices
          || (deps.requestServiceId !== undefined && services.has(deps.requestServiceId))
          || deps.serviceIds?.some((id) => services.has(id))))
        || (doctors.size > 0 && (deps.pendingDoctors || deps.doctorIds?.some((id) => doctors.has(id))))) {
        entry.invalidated = true;
        this.entries.delete(key);
      }
    }
  }

  resolve(
    key: string,
    initial: AvailabilityCacheDependencies,
    compute: (update: UpdateAvailabilityDependencies) => Promise<V>,
  ): Promise<V> {
    const cached = this.entries.get(key);
    if (cached && cached.expires > Date.now()) return cached.request;
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    const revision = this.revision;
    const entry: Entry<V> = {
      dependencies: { ...initial, countryCode: initial.countryCode.trim().toLowerCase() },
      request: undefined as unknown as Promise<V>,
      expires: Infinity,
      invalidated: false,
    };
    // Queue the compute until the entry exists, including synchronous invalidations.
    entry.request = Promise.resolve()
      .then(() => compute((dependencies) => Object.assign(entry.dependencies, dependencies)))
      .then((result) => {
        // Evicted pending work has no index entry. Any intervening event requires
        // a fresh read; otherwise it may finish uncached without growing metadata.
        if (entry.invalidated || (this.entries.get(key) !== entry && revision !== this.revision)) {
          return this.resolve(key, initial, compute);
        }
        entry.expires = Date.now() + this.ttlMs;
        return result;
      })
      .catch((error: unknown) => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
        throw error;
      });
    this.entries.set(key, entry);
    return entry.request;
  }
}
