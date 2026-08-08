/**
 * Wait for an audit row to appear, instead of reading once and hoping.
 *
 * Every audited route calls `recordAudit({...}).catch(() => {})` — deliberately
 * fire-and-forget, because a failed audit insert must never roll back the
 * change it describes (see `audit.service.ts`). The handler therefore returns
 * 200 while the INSERT is still in flight, and a test that reads immediately
 * afterwards is racing it.
 *
 * On an idle database the insert almost always wins, which is why this went
 * unnoticed for so long. Under a full-suite run — 200+ suites against one
 * Postgres — it loses often enough to fail roughly one test per run, and a
 * DIFFERENT one each time, which reads as random flakiness rather than as one
 * cause.
 *
 * The fix belongs here rather than in the routes: awaiting `recordAudit` would
 * make every audited mutation wait on the audit log and reverse a deliberate
 * design decision, to solve a problem that only exists in tests.
 *
 * Takes a finder rather than a Prisma client on purpose — these suites defer
 * importing `db/prisma.js` until `before()` has proved the database is
 * reachable, and a module-level import here would undo that.
 */
export async function waitForAuditRow<T>(
  find: () => Promise<T | null>,
  { timeoutMs = 2000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const row = await find();
    if (row) return row;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
