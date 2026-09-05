"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { AdminPatientSearchItem, VerificationStatus } from "@/lib/admin/admin-api";
import { AdminEmptyState, Btn, Pill } from "../../_components/atoms";
import { UserRound } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";

function verificationTone(status: VerificationStatus): "active" | "inactive" | "pending" | "neutral" {
  switch (status) {
    case "VERIFIED": return "active";
    case "REJECTED": return "inactive";
    case "PENDING": return "pending";
    default: return "neutral";
  }
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const label = status === "NOT_VERIFIED" ? "Not verified" : status.charAt(0) + status.slice(1).toLowerCase();
  return <Pill tone={verificationTone(status)}>{label}</Pill>;
}

// ponytail: list payload (AdminPatientSearchItem) has no phone number, country,
// or ID-card value — only verification status booleans. The drawer must not
// invent a client fetch to the PHI-gated detail endpoints (those are
// server-component-only, reason-gated via the httpOnly gh_phi_reason cookie
// set by phi-reason-gate.tsx), so it renders exactly what's already on the
// row plus a link to the full (PHI-gated) record.
function patientFields(): ColumnPriorityField<AdminPatientSearchItem>[] {
  return [
    {
      key: "patient",
      label: "Patient",
      priority: 1,
      render: (p) => (
        <div>
          <div className="font-medium text-[var(--color-text-primary)]">{p.fullName ?? "—"}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{p.email}</div>
        </div>
      ),
    },
    {
      key: "ghn",
      label: "GHN",
      priority: 1,
      render: (p) => (
        <code className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-xs">
          {p.globalHealthNumber ?? "—"}
        </code>
      ),
    },
    {
      key: "idStatus",
      label: "ID",
      priority: 1,
      render: (p) => <StatusBadge status={p.idVerificationStatus} />,
    },
    {
      key: "joined",
      label: "Joined",
      priority: 2,
      render: (p) => (
        <span className="text-[var(--color-text-muted)]">
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "emailStatus",
      label: "Email",
      priority: 3,
      render: (p) => <StatusBadge status={p.emailVerificationStatus} />,
    },
    {
      key: "phoneStatus",
      label: "Phone",
      priority: 3,
      render: (p) => <StatusBadge status={p.phoneVerificationStatus} />,
    },
    {
      key: "view",
      label: "",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (p) => (
        <Link
          href={`/admin/patients/${encodeURIComponent(p.email)}`}
          className="gh-link text-sm font-medium"
        >
          View →
        </Link>
      ),
    },
  ];
}

export function AdminPatientsTable({ items }: { items: AdminPatientSearchItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quickViewGhn, setQuickViewGhn] = useState<string | null>(() => searchParams.get("patient"));

  // URL param is GHN, never email/name/phone (no personal data in the URL).
  const quickViewPatient = quickViewGhn
    ? items.find((p) => p.globalHealthNumber === quickViewGhn) ?? null
    : null;

  function openQuickView(p: AdminPatientSearchItem) {
    if (!p.globalHealthNumber) return; // no stable non-PHI id to bind the URL to
    setQuickViewGhn(p.globalHealthNumber);
    const next = new URLSearchParams(searchParams.toString());
    next.set("patient", p.globalHealthNumber);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  if (items.length === 0) {
    return (
      <AdminEmptyState
        icon={<UserRound className="size-8" aria-hidden />}
        title="No patients found"
        description="Try a different Global Health Number or email. New patient records appear here after registration or a manual booking."
      />
    );
  }

  return (
    <>
      <ColumnPriorityTable<AdminPatientSearchItem>
        fields={patientFields()}
        rows={items}
        getRowKey={(p) => p.id}
        onRowClick={openQuickView}
        cardActions={(p) => (
          <>
            {/* `cardActions` replaces the default View button, and the link
                below goes to the full record — a different destination from
                the row handler's quick view. Without this control the drawer
                would have no mobile entry point. */}
            {p.globalHealthNumber ? (
              <button
                type="button"
                onClick={() => openQuickView(p)}
                aria-label={`Quick view patient ${p.globalHealthNumber}`}
                className="gh-btn gh-btn-soft text-sm"
              >
                Quick view
              </button>
            ) : null}
            <Link
              href={`/admin/patients/${encodeURIComponent(p.email)}`}
              className="gh-btn gh-btn-secondary text-sm"
            >
              View patient
            </Link>
          </>
        )}
      />

      <RecordDetailsDrawer
        open={quickViewPatient !== null}
        onOpenChange={(next) => {
          if (!next) setQuickViewGhn(null);
        }}
        paramKey="patient"
        paramValue={quickViewPatient?.globalHealthNumber ?? undefined}
        title={quickViewPatient ? `${quickViewPatient.fullName ?? quickViewPatient.email}` : ""}
        eyebrow={quickViewPatient?.globalHealthNumber ?? undefined}
        summary={
          quickViewPatient ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <StatusBadge status={quickViewPatient.idVerificationStatus} />
              <StatusBadge status={quickViewPatient.emailVerificationStatus} />
              <StatusBadge status={quickViewPatient.phoneVerificationStatus} />
            </div>
          ) : null
        }
        footer={
          quickViewPatient ? (
            <>
              <Btn variant="ghost" onClick={() => setQuickViewGhn(null)}>
                Close
              </Btn>
              <Link href={`/admin/patients/${encodeURIComponent(quickViewPatient.email)}`}>
                <Btn variant="primary">Open full record</Btn>
              </Link>
            </>
          ) : null
        }
      >
        {quickViewPatient ? (
          <>
            <RecordDetailsSection title="Contact">
              <RecordDetailsField label="Email" value={quickViewPatient.email} />
              <RecordDetailsField
                label="Email verification"
                value={<StatusBadge status={quickViewPatient.emailVerificationStatus} />}
              />
              <RecordDetailsField
                label="Phone verification"
                value={<StatusBadge status={quickViewPatient.phoneVerificationStatus} />}
              />
            </RecordDetailsSection>

            <RecordDetailsSection title="Account">
              <RecordDetailsField
                label="Global Health No."
                value={<code className="text-xs">{quickViewPatient.globalHealthNumber ?? "—"}</code>}
              />
              <RecordDetailsField
                label="ID verification"
                value={<StatusBadge status={quickViewPatient.idVerificationStatus} />}
              />
              <RecordDetailsField
                label="Joined"
                value={new Date(quickViewPatient.createdAt).toLocaleDateString()}
              />
            </RecordDetailsSection>
          </>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}
