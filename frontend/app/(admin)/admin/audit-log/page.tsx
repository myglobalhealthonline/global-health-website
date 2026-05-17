import { fetchAdminAuditLog } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader } from "../_components/atoms";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
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
};

const ACTION_TONE: Record<string, string> = {
  CONSULT_SIGNED: "bg-emerald-100 text-emerald-800",
  SHARE_LINK_REVOKED: "bg-amber-100 text-amber-800",
  EXAM_DELETED: "bg-rose-100 text-rose-800",
  CONSULT_SERVICE_REMOVED: "bg-rose-100 text-rose-800",
};

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
  const page = Number(pick(sp, "page") ?? "1") || 1;

  const result = await fetchAdminAuditLog({
    page,
    pageSize: 50,
    action,
    entityType,
    entityId,
    actorUserId,
  });

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="Append-only trail of clinical mutations and collaboration events. Filter by entity or actor to investigate a specific case."
      />

      <AdminCard>
        <form className="mb-4 grid gap-3 sm:grid-cols-4" method="get">
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
          <div className="sm:col-span-4">
            <button type="submit" className="gh-btn gh-btn-primary text-sm">
              Apply
            </button>
          </div>
        </form>

        {!result.ok ? (
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        ) : result.data.items.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No audit events match those filters.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--color-background-soft)] text-left text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                  <th className="px-3 py-2 font-semibold">Entity</th>
                  <th className="px-3 py-2 font-semibold">Metadata</th>
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
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
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
                    <td className="px-3 py-2">
                      {r.metadata ? (
                        <pre className="m-0 whitespace-pre-wrap break-all text-[11px] text-[var(--color-text-muted)]">
                          {JSON.stringify(r.metadata, null, 0)}
                        </pre>
                      ) : (
                        <span className="text-[12px] text-[var(--color-text-muted)]">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.data.pagination.totalPages > 1 ? (
              <div className="border-t border-[var(--color-border)] px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
                Page {result.data.pagination.page} of{" "}
                {result.data.pagination.totalPages} ·{" "}
                {result.data.pagination.total} events total
              </div>
            ) : null}
          </div>
        )}
      </AdminCard>
    </>
  );
}
