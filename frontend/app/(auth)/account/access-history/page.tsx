"use client";

import { useEffect, useState } from "react";
import { History, Shield } from "lucide-react";

type AccessLogEntry = {
  id: string;
  accessedByName: string | null;
  accessedByRole: string;
  accessedResourceType: string;
  accessedResourceId: string | null;
  accessAction: string;
  accessReason: string | null;
  relatedAppointmentId: string | null;
  createdAt: string;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

const ROLE_LABEL: Record<string, string> = {
  PATIENT: "You",
  DOCTOR: "Doctor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Admin",
  STAFF: "Staff",
  SYSTEM: "System",
};

const ACTION_LABEL: Record<string, string> = {
  VIEW: "Viewed",
  DOWNLOAD: "Downloaded",
  UPLOAD: "Uploaded",
  EDIT: "Updated",
  DELETE: "Deleted",
};

const RESOURCE_LABEL: Record<string, string> = {
  MedicalDocuments: "medical files list",
  MedicalDocument: "medical document",
  MEDICAL_DOC: "medical document",
  PatientProfile: "profile",
  SENSITIVE_PROFILE: "sensitive profile data",
  ID_DOC: "ID document",
  NATIONALITY_DOC: "nationality document",
  INSURANCE_DOC: "insurance document",
  InsuranceDocument: "insurance document",
};

function roleBadgeClass(role: string): string {
  switch (role) {
    case "PATIENT": return "bg-sky-50 text-sky-700";
    case "DOCTOR": return "bg-violet-50 text-violet-700";
    case "ADMIN":
    case "SUPER_ADMIN": return "bg-amber-50 text-amber-700";
    case "SYSTEM": return "bg-slate-100 text-slate-600";
    default: return "bg-slate-100 text-slate-600";
  }
}

function LogRow({ entry }: { entry: AccessLogEntry }) {
  const role = ROLE_LABEL[entry.accessedByRole] ?? entry.accessedByRole;
  const action = ACTION_LABEL[entry.accessAction] ?? entry.accessAction;
  const resource = RESOURCE_LABEL[entry.accessedResourceType] ?? entry.accessedResourceType.toLowerCase().replace(/_/g, " ");
  const byName = entry.accessedByName && entry.accessedByRole !== "PATIENT"
    ? entry.accessedByName
    : null;

  return (
    <div className="gh-patient-access-row flex items-start gap-4 border-b border-[var(--color-border)] py-3 last:border-0">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-soft)]">
        <Shield className="size-4 text-[var(--color-text-muted)]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--color-text-primary)]">
          <span
            className={`mr-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(entry.accessedByRole)}`}
          >
            {role}
          </span>
          {byName && <span className="mr-1 font-medium">{byName}</span>}
          <span className="lowercase">{action}</span>
          {" "}
          <span className="lowercase">your {resource}</span>
        </p>
        {entry.accessReason && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Reason: {entry.accessReason}
          </p>
        )}
        {entry.relatedAppointmentId && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Related to appointment
          </p>
        )}
      </div>
      <time
        dateTime={entry.createdAt}
        className="shrink-0 text-xs text-[var(--color-text-muted)]"
      >
        {new Date(entry.createdAt).toLocaleString()}
      </time>
    </div>
  );
}

export default function AccessHistoryPage() {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    void fetch(`/api/account/access-log?page=${page}&limit=20`, { credentials: "include" })
      .then((r) => r.json())
      .then(
        (json: {
          ok?: boolean;
          data?: { logs?: AccessLogEntry[]; pagination?: Pagination };
        }) => {
          if (json.ok && json.data) {
            setLogs(json.data.logs ?? []);
            setPagination(json.data.pagination ?? null);
          }
        },
      )
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [page]);

  return (
    <div className="gh-patient-page gh-patient-access-history-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Patient portal
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <History className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          Access history
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          A record of who accessed your medical information and when.
        </p>
      </header>

      <div className="gh-patient-access-card gh-card divide-y divide-[var(--color-border)] p-0">
        {!loaded ? (
          <div className="p-6 text-sm text-[var(--color-text-muted)]">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            No access events recorded yet.
          </div>
        ) : (
          <div className="px-4">
            {logs.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">
            {pagination.total} events · page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
