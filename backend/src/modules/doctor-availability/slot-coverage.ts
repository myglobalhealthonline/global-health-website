type Range = { from: number; to: number; expiresAt: number; version: number };

/**
 * Bounded, process-local evidence that recurring-window materialisation has
 * completed for a doctor and UTC half-open range. It is deliberately not
 * inferred from slot rows: no-window days and exception holes are valid
 * successful results. A miss or expired entry always falls back to generation.
 */
export class SlotCoverage {
  private readonly ranges = new Map<string, Range[]>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly versions = new Map<string, number>();
  private sequence = 0;
  private readonly queues = new Map<string, Promise<void>>();

  constructor(private readonly ttlMs: number, private readonly maxRangesPerDoctor: number, private readonly maxDoctors = 1000) {}

  version(doctorId: string): number {
    let version = this.versions.get(doctorId);
    if (version !== undefined) return version;
    while (this.versions.size >= this.maxDoctors) {
      const oldest = this.versions.keys().next().value!;
      this.versions.delete(oldest);
      this.ranges.delete(oldest);
    }
    version = ++this.sequence;
    this.versions.set(doctorId, version);
    return version;
  }
  invalidate(doctorId: string): void {
    this.versions.delete(doctorId);
    this.ranges.delete(doctorId);
  }

  clear(): void { this.versions.clear(); this.ranges.clear(); }

  async exclusive<T>(doctorId: string, work: () => Promise<T>): Promise<T> {
    // Bound distinct active doctor queues without abandoning serialization.
    while (!this.queues.has(doctorId) && this.queues.size >= 128) {
      await Promise.race(this.queues.values());
    }
    const previous = this.queues.get(doctorId) ?? Promise.resolve();
    let release!: () => void;
    const completed = new Promise<void>(resolve => { release = resolve; });
    const tail = previous.then(() => completed);
    this.queues.set(doctorId, tail);
    await previous;
    try { return await work(); }
    finally {
      release();
      if (this.queues.get(doctorId) === tail) this.queues.delete(doctorId);
    }
  }

  hasRanges(doctorId: string, now = Date.now()): boolean {
    return (this.ranges.get(doctorId) ?? []).some(range => range.expiresAt > now);
  }

  missingRanges(doctorId: string, from: Date, to: Date, now = Date.now()): Array<{ from: Date; to: Date }> {
    const gaps: Array<{ from: Date; to: Date }> = [];
    let cursor = from.getTime();
    for (const range of this.ranges.get(doctorId) ?? []) {
      if (range.expiresAt <= now || range.to <= cursor) continue;
      if (range.from >= to.getTime()) break;
      if (range.from > cursor) gaps.push({ from: new Date(cursor), to: new Date(Math.min(range.from, to.getTime())) });
      cursor = Math.max(cursor, range.to);
    }
    if (cursor < to.getTime()) gaps.push({ from: new Date(cursor), to });
    return gaps;
  }

  covers(doctorId: string, from: Date, to: Date, now = Date.now()): boolean {
    const version = this.version(doctorId);
    return (this.ranges.get(doctorId) ?? []).some(
      (range) => range.version === version && range.expiresAt > now && range.from <= from.getTime() && range.to >= to.getTime(),
    );
  }

  record(doctorId: string, from: Date, to: Date, version: number, now = Date.now()): void {
    if (version !== this.versions.get(doctorId) || to <= from) return;
    const next: Range = { from: from.getTime(), to: to.getTime(), version, expiresAt: now + this.ttlMs };
    const compatible = (this.ranges.get(doctorId) ?? []).filter((range) => range.version === version && range.expiresAt > now);
    compatible.push(next);
    compatible.sort((a, b) => a.from - b.from);
    const merged: Range[] = [];
    for (const range of compatible) {
      const previous = merged.at(-1);
      if (previous && range.from <= previous.to) {
        previous.to = Math.max(previous.to, range.to);
        // Extending a horizon must not extend the age of its older evidence.
        previous.expiresAt = Math.min(previous.expiresAt, range.expiresAt);
      } else merged.push(range);
    }
    this.ranges.set(doctorId, merged.slice(-this.maxRangesPerDoctor));
  }

  singleFlight<T>(doctorId: string, from: Date, to: Date, work: () => Promise<T>): Promise<T> {
    const key = `${doctorId}:${this.version(doctorId)}:${from.getTime()}:${to.getTime()}`;
    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;
    // Do not retain arbitrary request-range keys during a traffic burst.
    if (this.inFlight.size >= 128) return work();
    const created = work().finally(() => {
      if (this.inFlight.get(key) === created) this.inFlight.delete(key);
    });
    this.inFlight.set(key, created);
    return created;
  }
}
