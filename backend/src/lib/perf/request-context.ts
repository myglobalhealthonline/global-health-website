import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request performance counters (perf plan docs/plans/new.md phase 1).
 *
 * Deliberately numeric-only: counts, durations and an opaque request id. No
 * SQL text, no bound parameters, no URLs with record ids, no headers — a
 * performance trace must never become a second copy of the data it measured.
 */
export type PerfContext = {
  /** Opaque id, forwarded from Next when present so one page render can be
   *  followed across both processes. Never derived from user data. */
  requestId: string;
  dbQueries: number;
  dbMs: number;
  /** Named spans a handler chose to time, e.g. `query`, `bookability`. */
  phases: Map<string, number>;
};

const storage = new AsyncLocalStorage<PerfContext>();

export function runWithPerfContext<T>(context: PerfContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function currentPerfContext(): PerfContext | undefined {
  return storage.getStore();
}

/** Record one database round trip. No-op outside a request. */
export function recordDbQuery(durationMs: number): void {
  const context = storage.getStore();
  if (!context) return;
  context.dbQueries += 1;
  context.dbMs += durationMs;
}

/**
 * Time one named phase of the current request. Returns the awaited value
 * unchanged, so it can wrap an existing expression without restructuring it.
 * Outside a request it is a pass-through.
 */
export async function timePhase<T>(name: string, run: () => Promise<T>): Promise<T> {
  const context = storage.getStore();
  if (!context) return run();
  const startedAt = performance.now();
  try {
    return await run();
  } finally {
    const elapsed = performance.now() - startedAt;
    context.phases.set(name, (context.phases.get(name) ?? 0) + elapsed);
  }
}

/** `Server-Timing` value for the phases collected so far. Names are fixed
 *  identifiers chosen in code, so this header cannot leak request data. */
export function serverTimingHeader(context: PerfContext, totalMs: number): string {
  const parts = [
    `db;dur=${context.dbMs.toFixed(1)}`,
    // Round-trip COUNT, not a duration. Server-Timing has no count field, so
    // it rides as a zero-duration entry with the count in its description —
    // this is the number the N+1 work is judged by.
    `dbq;desc="${context.dbQueries}";dur=0`,
  ];
  for (const [name, ms] of context.phases) {
    parts.push(`${name};dur=${ms.toFixed(1)}`);
  }
  parts.push(`total;dur=${totalMs.toFixed(1)}`);
  return parts.join(", ");
}
