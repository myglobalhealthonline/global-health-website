"use client";

import { useEffect, useState } from "react";
import { History, Shield } from "lucide-react";
import { PageHeader } from "@/components/portal-atoms";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";

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

export type AccessHistoryI18n = ReturnType<typeof loadLocaleBundle>["account"]["accessHistory"];

function roleLabels(i18n: AccessHistoryI18n): Record<string, string> {
  return {
    PATIENT: i18n.roleYou,
    DOCTOR: i18n.roleDoctor,
    ADMIN: i18n.roleAdmin,
    SUPER_ADMIN: i18n.roleAdmin,
    STAFF: i18n.roleStaff,
    SYSTEM: i18n.roleSystem,
  };
}

function actionLabels(i18n: AccessHistoryI18n): Record<string, string> {
  return {
    VIEW: i18n.actionViewed,
    DOWNLOAD: i18n.actionDownloaded,
    UPLOAD: i18n.actionUploaded,
    EDIT: i18n.actionUpdated,
    DELETE: i18n.actionDeleted,
  };
}

function resourceLabels(i18n: AccessHistoryI18n): Record<string, string> {
  return {
    MedicalDocuments: i18n.resourceMedicalDocuments,
    MedicalDocument: i18n.resourceMedicalDocument,
    MEDICAL_DOC: i18n.resourceMedicalDocument,
    PatientProfile: i18n.resourcePatientProfile,
    SENSITIVE_PROFILE: i18n.resourceSensitiveProfile,
    ID_DOC: i18n.resourceIdDoc,
    NATIONALITY_DOC: i18n.resourceNationalityDoc,
    INSURANCE_DOC: i18n.resourceInsuranceDoc,
    InsuranceDocument: i18n.resourceInsuranceDoc,
  };
}

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

function LogRow({ entry, i18n }: { entry: AccessLogEntry; i18n: AccessHistoryI18n }) {
  const role = roleLabels(i18n)[entry.accessedByRole] ?? entry.accessedByRole;
  const action = actionLabels(i18n)[entry.accessAction] ?? entry.accessAction;
  const resource = resourceLabels(i18n)[entry.accessedResourceType] ?? entry.accessedResourceType.toLowerCase().replace(/_/g, " ");
  const byName = entry.accessedByName && entry.accessedByRole !== "PATIENT"
    ? entry.accessedByName
    : null;

  return (
    <div className="gh-patient-access-row grid gap-3 border-b border-[var(--portal-line)] py-3 last:border-0 sm:grid-cols-[auto_1fr_auto] sm:items-start">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--portal-well)]">
        <Shield className="size-4 text-[var(--portal-muted)]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--portal-text)]">
          <span
            className={`mr-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(entry.accessedByRole)}`}
          >
            {role}
          </span>
          {byName && <span className="mr-1 font-medium">{byName}</span>}
          <span className="lowercase">{action}</span>
          {" "}
          <span className="lowercase">{resource}</span>
        </p>
        {entry.accessReason && (
          <p className="mt-0.5 text-xs text-[var(--portal-muted)]">
            {i18n.reason}: {entry.accessReason}
          </p>
        )}
        {entry.relatedAppointmentId && (
          <p className="mt-0.5 text-xs text-[var(--portal-muted)]">
            {i18n.relatedAppointment}
          </p>
        )}
      </div>
      <time
        dateTime={entry.createdAt}
        className="text-xs text-[var(--portal-muted)] sm:shrink-0"
      >
        {new Date(entry.createdAt).toLocaleString()}
      </time>
    </div>
  );
}

export function AccessHistoryClient({ i18n }: { i18n: AccessHistoryI18n }) {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Reset loading flag for the new page before the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <PageHeader
        eyebrow={i18n.breadcrumb}
        title={
          <span className="inline-flex items-center gap-2">
            <History className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {i18n.title}
          </span>
        }
        description={i18n.subtitle}
      />

      <div className="gh-patient-access-card gh-card divide-y divide-[var(--portal-line)] p-0">
        {!loaded ? (
          <div className="p-6">
            <div className="h-4 w-40 rounded bg-[var(--portal-well)]" />
            <div className="mt-4 grid gap-3">
              <div className="h-16 rounded-lg bg-[var(--portal-well)]" />
              <div className="h-16 rounded-lg bg-[var(--portal-well)]" />
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="mx-auto size-7 text-[var(--portal-muted)]" aria-hidden />
            <p className="mt-2 text-base font-bold text-[var(--portal-text)]">
              {i18n.emptyTitle}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--portal-muted)]">
              {i18n.emptyBody}
            </p>
          </div>
        ) : (
          <div className="px-4">
            {logs.map((entry) => (
              <LogRow key={entry.id} entry={entry} i18n={i18n} />
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-[var(--portal-muted)]">
            {i18n.eventsPage
              .replace("{total}", String(pagination.total))
              .replace("{page}", String(pagination.page))
              .replace("{pages}", String(pagination.pages))}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-[var(--portal-line)] px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {i18n.previous}
            </button>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-[var(--portal-line)] px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {i18n.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
