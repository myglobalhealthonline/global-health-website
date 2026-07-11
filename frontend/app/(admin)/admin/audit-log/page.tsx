import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { fetchAdminAuditLog } from "@/lib/admin/admin-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader } from "../_components/atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/**
 * Renders a before/after or flag-map diff for the audit actions whose
 * `metadata` already carries structured change data. Everything else
 * falls back to a raw collapsible JSON block — see task report for why a
 * true structured diff isn't available for every action yet.
 */
function AuditDiff({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object") {
    return <span className="text-[12px] text-[var(--color-text-muted)]">—</span>;
  }
  const m = metadata as Record<string, unknown>;

  if (m.before && m.after && typeof m.before === "object" && typeof m.after === "object") {
    const before = m.before as Record<string, unknown>;
    const after = m.after as Record<string, unknown>;
    const fields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
      (f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]),
    );
    return (
      <details>
        <summary className="cursor-pointer text-[11px] font-semibold text-[var(--color-brand-primary)]">
          View diff ({fields.length})
        </summary>
        <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--color-text-muted)]">
          {fields.map((f) => (
            <li key={f}>
              <span className="font-semibold text-[var(--color-text-primary)]">{f}</span>:{" "}
              {String(before[f] ?? "—")} → {String(after[f] ?? "—")}
            </li>
          ))}
        </ul>
      </details>
    );
  }

  if (m.changes && typeof m.changes === "object") {
    const changed = Object.keys(m.changes as Record<string, unknown>).filter(
      (f) => (m.changes as Record<string, unknown>)[f],
    );
    if (changed.length > 0) {
      return (
        <details>
          <summary className="cursor-pointer text-[11px] font-semibold text-[var(--color-brand-primary)]">
            View diff ({changed.length})
          </summary>
          <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--color-text-muted)]">
            {changed.map((f) => (
              <li key={f}>
                <span className="font-semibold text-[var(--color-text-primary)]">{f}</span> changed
                {m[f] !== undefined ? <> → new value: {String(m[f])}</> : null}
              </li>
            ))}
          </ul>
        </details>
      );
    }
  }

  return (
    <details>
      <summary className="cursor-pointer text-[11px] font-semibold text-[var(--color-brand-primary)]">
        Raw payload
      </summary>
      <pre className="m-0 mt-1 whitespace-pre-wrap break-all text-[11px] text-[var(--color-text-muted)]">
        {JSON.stringify(metadata, null, 0)}
      </pre>
    </details>
  );
}

const ACTION_LABEL: Record<string, string> = {
  CONSULT_SAVED: "Consultation saved",
  CONSULT_SIGNED: "Consultation signed",
  EXAM_LOGGED: "Exam result logged",
  EXAM_DELETED: "Exam result deleted",
  INTERNAL_MESSAGE_POSTED: "Internal message posted",
  SHARE_LINK_CREATED: "Share link created",
  SHARE_LINK_REVOKED: "Share link revoked",
  FORM_SUBMITTED: "Form submitted",
  CONSULT_SERVICE_ADDED: "Service line added",
  CONSULT_SERVICE_REMOVED: "Service line removed",
  LOGIN: "Login",
  LOGOUT: "Logout",
  LOGIN_FAILED: "Login failed",
  PATIENT_ALERT_UPDATED: "Patient alert updated",
  USER_UPDATED: "User updated",
  USER_ROLE_CHANGED: "User role changed",
  USER_PASSWORD_RESET: "User password reset (admin)",
  PATIENT_PROFILE_UPDATED: "Patient profile updated",
  ENTITY_PURGED: "Entity permanently deleted",
};

const ACTION_TONE: Record<string, string> = {
  CONSULT_SIGNED: "bg-emerald-100 text-emerald-800",
  SHARE_LINK_REVOKED: "bg-amber-100 text-amber-800",
  EXAM_DELETED: "bg-rose-100 text-rose-800",
  CONSULT_SERVICE_REMOVED: "bg-rose-100 text-rose-800",
  LOGIN: "bg-sky-100 text-sky-800",
  LOGOUT: "bg-slate-200 text-slate-700",
  LOGIN_FAILED: "bg-rose-100 text-rose-800",
  PATIENT_ALERT_UPDATED: "bg-amber-100 text-amber-800",
};

/** Action-group quick filters wired to the comma-list `action` query
 *  param the backend now accepts. */
const QUICK_FILTERS: Array<{ label: string; actions: string[] }> = [
  { label: "Logins", actions: ["LOGIN", "LOGOUT", "LOGIN_FAILED"] },
  { label: "Patient alerts", actions: ["PATIENT_ALERT_UPDATED"] },
  { label: "Consultations", actions: ["CONSULT_SAVED", "CONSULT_SIGNED"] },
];

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const action = pick(sp, "action");
  const entityType = pick(sp, "entityType");
  const entityId = pick(sp, "entityId");
  const actorUserId = pick(sp, "actorUserId");
  const fromDate = pick(sp, "fromDate");
  const toDate = pick(sp, "toDate");
  const page = Number(pick(sp, "page") ?? "1") || 1;

  const result = await fetchAdminAuditLog({
    page,
    pageSize: 50,
    action,
    entityType,
    entityId,
    actorUserId,
    fromDate,
    toDate,
  });
  const auditItems = result.ok ? result.data.items : [];
  const visibleFailures = auditItems.filter((r) => r.action === "LOGIN_FAILED").length;
  const visibleClinicalEvents = auditItems.filter((r) =>
    ["CONSULT_SAVED", "CONSULT_SIGNED", "EXAM_LOGGED", "FORM_SUBMITTED"].includes(r.action),
  ).length;

  // Export uses the SAME active filters as the list view but no pagination —
  // the backend returns every matching row (capped) as a CSV download.
  const exportQs = new URLSearchParams();
  if (action) exportQs.set("action", action);
  if (entityType) exportQs.set("entityType", entityType);
  if (entityId) exportQs.set("entityId", entityId);
  if (actorUserId) exportQs.set("actorUserId", actorUserId);
  if (fromDate) exportQs.set("fromDate", fromDate);
  if (toDate) exportQs.set("toDate", toDate);
  const exportHref = `/api/admin/audit-log/export${exportQs.toString() ? `?${exportQs.toString()}` : ""}`;

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="Append-only trail of clinical mutations and collaboration events. Filter by entity or actor to investigate a specific case."
      />

      <AdminCard>
        {result.ok ? (
          <AdminSummaryStrip
            items={[
              {
                label: "Events shown",
                value: auditItems.length,
                hint: `${result.data.pagination.total} total`,
                tone: "brand",
              },
              {
                label: "Clinical events",
                value: visibleClinicalEvents,
                hint: "Visible page",
                tone: visibleClinicalEvents > 0 ? "success" : "neutral",
              },
              {
                label: "Login failures",
                value: visibleFailures,
                hint: "Visible page",
                tone: visibleFailures > 0 ? "warning" : "neutral",
              },
            ]}
          />
        ) : null}
        <div className="gh-admin-ops-quick-filters mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            Quick filters
          </span>
          {QUICK_FILTERS.map((qf) => {
            const value = qf.actions.join(",");
            const isActive = (action ?? "") === value;
            return (
              <a
                key={qf.label}
                href={`?action=${encodeURIComponent(value)}`}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                  isActive
                    ? "bg-[var(--color-brand-primary)] text-white"
                    : "bg-[var(--color-background-soft)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
                }`}
              >
                {qf.label}
              </a>
            );
          })}
          {action ? (
            <a
              href="?"
              className="rounded-full px-3 py-1 text-[12px] font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
            >
              Clear
            </a>
          ) : null}
        </div>

        <form className="gh-admin-ops-filter-grid mb-4 grid gap-3 sm:grid-cols-4" method="get">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Action</span>
            <select name="action" defaultValue={action ?? ""} className="gh-select">
              <option value="">Any</option>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Entity type</span>
            <input
              name="entityType"
              defaultValue={entityType ?? ""}
              placeholder="Consultation, ExamResult…"
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Entity id</span>
            <input
              name="entityId"
              defaultValue={entityId ?? ""}
              className="gh-input font-mono text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Actor user id</span>
            <input
              name="actorUserId"
              defaultValue={actorUserId ?? ""}
              className="gh-input font-mono text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">From date</span>
            <input type="date" name="fromDate" defaultValue={fromDate ?? ""} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">To date</span>
            <input type="date" name="toDate" defaultValue={toDate ?? ""} className="gh-input" />
          </label>
          <div className="flex items-center gap-3 sm:col-span-4">
            <button type="submit" className="gh-btn gh-btn-primary text-sm">
              Apply
            </button>
            <a href={exportHref} download className="gh-btn gh-btn-outline text-sm">
              Export CSV
            </a>
          </div>
        </form>

        {!result.ok ? (
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        ) : result.data.items.length === 0 ? (
          <AdminEmptyState
            icon={<ShieldCheck className="size-8" aria-hidden />}
            title="No audit events match those filters"
            description="Clear quick filters or search by a different entity or actor to inspect the compliance trail."
          />
        ) : (
          <>
          <div className="gh-admin-mobile-list">
            {result.data.items.map((r) => (
              <PortalMobileCard
                key={r.id}
                title={ACTION_LABEL[r.action] ?? r.action}
                subtitle={new Date(r.createdAt).toLocaleString()}
                statusPill={
                  <span
                    className={`gh-admin-ops-badge inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                      ACTION_TONE[r.action] ??
                      "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {r.action}
                  </span>
                }
                meta={[
                  { label: "Actor", value: r.actor ? `${r.actor.fullName} (${r.actor.email})` : "System" },
                  { label: "Entity", value: r.entityType },
                  { label: "ID", value: <span className="break-all">{r.entityId}</span> },
                  ...(r.ipAddress ? [{ label: "IP", value: r.ipAddress }] : []),
                ]}
              />
            ))}
          </div>
          <div className="gh-admin-ops-table-wrap gh-admin-deep-table-wrap overflow-x-auto rounded-md border border-[var(--color-border)]">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--color-background-soft)] text-left text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                  <th className="px-3 py-2 font-semibold">Entity</th>
                  <th className="px-3 py-2 font-semibold gh-cpt-p3">IP</th>
                  <th className="px-3 py-2 font-semibold gh-cpt-p3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {result.data.items.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`gh-admin-ops-badge inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                          ACTION_TONE[r.action] ??
                          "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {ACTION_LABEL[r.action] ?? r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.actor ? (
                        <>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {r.actor.fullName}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            {r.actor.email} · {r.actorRole ?? r.actor.role}
                          </p>
                        </>
                      ) : (
                        <span className="text-[12px] text-[var(--color-text-muted)]">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11.5px]">
                      <p className="text-[var(--color-text-primary)]">{r.entityType}</p>
                      <p className="text-[var(--color-text-muted)]">{r.entityId}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--color-text-muted)] gh-cpt-p3">
                      {r.ipAddress ?? "—"}
                    </td>
                    <td className="px-3 py-2 gh-cpt-p3">
                      <AuditDiff metadata={r.metadata} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.data.pagination.totalPages > 1 ? (
              (() => {
                const { page: cur, totalPages } = result.data.pagination;
                const linkFor = (p: number) => {
                  const qs = new URLSearchParams();
                  if (action) qs.set("action", action);
                  if (entityType) qs.set("entityType", entityType);
                  if (entityId) qs.set("entityId", entityId);
                  if (actorUserId) qs.set("actorUserId", actorUserId);
                  if (fromDate) qs.set("fromDate", fromDate);
                  if (toDate) qs.set("toDate", toDate);
                  qs.set("page", String(p));
                  return `/admin/audit-log?${qs.toString()}`;
                };
                return (
                  <div className="gh-admin-ops-pagination flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
                    <span>
                      Page {cur} of {totalPages} · {result.data.pagination.total} events total
                    </span>
                    <span className="flex gap-2">
                      {cur > 1 ? (
                        <Link href={linkFor(cur - 1)} className="font-semibold underline">
                          ← Prev
                        </Link>
                      ) : null}
                      {cur < totalPages ? (
                        <Link href={linkFor(cur + 1)} className="font-semibold underline">
                          Next →
                        </Link>
                      ) : null}
                    </span>
                  </div>
                );
              })()
            ) : null}
          </div>
          </>
        )}
      </AdminCard>
    </>
  );
}
