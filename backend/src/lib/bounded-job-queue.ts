/** Small coalescing queue for scheduled work. Kept independent of cron modules
 * so its concurrency/liveness rules can be tested without a database. */
export class BoundedJobQueue {
  private readonly queued = new Map<string, () => Promise<void>>();
  private readonly active = new Set<string>();
  private stopped = false;

  constructor(private readonly maxConcurrent: number, private readonly onFinish?: (name: string, ms: number) => void) {}

  enqueue(name: string, job: () => Promise<void>): void {
    if (this.stopped || this.queued.has(name) || this.active.has(name)) return;
    this.queued.set(name, job);
    this.drain();
  }

  stop(): void { this.stopped = true; this.queued.clear(); }
  get activeCount(): number { return this.active.size; }
  get queuedCount(): number { return this.queued.size; }

  private drain(): void {
    while (!this.stopped && this.active.size < this.maxConcurrent) {
      const next = this.queued.entries().next();
      if (next.done) return;
      const [name, job] = next.value;
      this.queued.delete(name);
      this.active.add(name);
      const started = performance.now();
      void Promise.resolve().then(job).catch(() => undefined).finally(() => {
        this.active.delete(name);
        this.onFinish?.(name, performance.now() - started);
        this.drain();
      });
    }
  }
}
