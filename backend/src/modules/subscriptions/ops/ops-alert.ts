import { env } from "../../../config/env.js";

/**
 * Money/ops alert sink (§39). Every reconciliation check + subscription webhook
 * failure routes through here. Delivery:
 *   - always logs via the registered logger (server log),
 *   - optionally POSTs to OPS_ALERT_WEBHOOK (Slack/Discord/generic) when set.
 * NEVER throws — alerting must not break the caller (fail-closed jobs still
 * surface their own errors).
 */

export type OpsAlertSeverity = "info" | "warning" | "critical";

export interface OpsAlert {
  severity: OpsAlertSeverity;
  title: string;
  detail?: string;
  context?: Record<string, unknown>;
}

type Logger = { warn: (msg: string) => void; error: (msg: string) => void };

let logger: Logger | null = null;

/** Wire the app logger once at boot (server.ts / scheduler). */
export function setOpsAlertLogger(next: Logger): void {
  logger = next;
}

export async function emitOpsAlert(alert: OpsAlert): Promise<void> {
  const line = `[ops-alert:${alert.severity}] ${alert.title}${alert.detail ? ` — ${alert.detail}` : ""}`;
  try {
    if (alert.severity === "info") logger?.warn(line);
    else logger?.error(line);
  } catch {
    /* logging must never throw */
  }

  const url = env.OPS_ALERT_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: line, ...alert }),
    });
  } catch {
    /* a down webhook must never break a money job */
  }
}

/**
 * Convenience: alert on a non-empty reconciliation report. Severity is critical
 * for ledger/balance invariant breaks (possible double-spend), warning for the
 * rest.
 */
export async function alertOnReconciliation(report: {
  drift: unknown[];
  invariantAlerts: Array<{ kind: string }>;
  priceSyncFailures: unknown[];
}): Promise<void> {
  const invariantBreaks = report.invariantAlerts.filter((a) => a.kind === "ledger_balance_mismatch");
  const total =
    report.drift.length + report.invariantAlerts.length + report.priceSyncFailures.length;
  if (total === 0) return;
  await emitOpsAlert({
    severity: invariantBreaks.length > 0 ? "critical" : "warning",
    title: "Subscription reconciliation found issues",
    detail: `drift=${report.drift.length} invariantAlerts=${report.invariantAlerts.length} priceSyncFailures=${report.priceSyncFailures.length}`,
    context: { invariantBreaks: invariantBreaks.length },
  });
}
