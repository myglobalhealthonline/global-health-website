import type { Pool } from "pg";
import { recordDbQuery } from "./request-context.js";

/**
 * Count database round trips per request at the `pg.Pool` boundary
 * (perf plan docs/plans/new.md phase 1).
 *
 * Why here and not through Prisma: Prisma's `query` event is emitted from the
 * engine's own async context, so it cannot be correlated with the request that
 * caused it. The pool is ours — every Prisma call reaches Postgres through
 * `pool.query` or a client checked out with `pool.connect()`, and both run in
 * the caller's async context, which is exactly what `AsyncLocalStorage` needs.
 *
 * Only the elapsed time is recorded. The SQL text and its bound parameters are
 * never read, so patient data cannot reach a metric.
 */
export function instrumentPool(pool: Pool): void {
  const marker = pool as Pool & { __perfInstrumented?: boolean };
  if (marker.__perfInstrumented) return;
  marker.__perfInstrumented = true;

  const timed = <A extends unknown[], R>(run: (...args: A) => R) =>
    function (this: unknown, ...args: A): R {
      const startedAt = performance.now();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        recordDbQuery(performance.now() - startedAt);
      };
      const result = run.apply(this, args) as R;
      // `query` returns a promise unless the caller passed a callback, in
      // which case the return value is void and the timing ends immediately.
      if (result && typeof (result as { then?: unknown }).then === "function") {
        void (result as unknown as Promise<unknown>).then(finish, finish);
      } else {
        finish();
      }
      return result;
    };

  const originalQuery = pool.query.bind(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg's query() is heavily overloaded; the wrapper is pass-through.
  pool.query = timed(originalQuery) as any;

  const originalConnect = pool.connect.bind(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same reason as above.
  pool.connect = function (this: unknown, ...args: unknown[]): any {
    const result = (originalConnect as (...a: unknown[]) => unknown).apply(this, args);
    if (result && typeof (result as { then?: unknown }).then === "function") {
      return (result as Promise<unknown>).then((client) => {
        instrumentClient(client);
        return client;
      });
    }
    return result;
  } as typeof pool.connect;
}

function instrumentClient(client: unknown): void {
  if (!client || typeof client !== "object") return;
  const target = client as { query?: unknown; __perfInstrumented?: boolean };
  if (target.__perfInstrumented || typeof target.query !== "function") return;
  target.__perfInstrumented = true;
  const originalQuery = (target.query as (...a: unknown[]) => unknown).bind(client);
  target.query = function (...args: unknown[]): unknown {
    const startedAt = performance.now();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      recordDbQuery(performance.now() - startedAt);
    };
    const result = originalQuery(...args);
    if (result && typeof (result as { then?: unknown }).then === "function") {
      void (result as Promise<unknown>).then(finish, finish);
    } else {
      finish();
    }
    return result;
  };
}
