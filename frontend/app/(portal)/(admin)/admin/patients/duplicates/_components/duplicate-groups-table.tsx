"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn, Pill } from "../../../_components/atoms";

export type DuplicateSide = {
  patientProfileId: string;
  fullName: string | null;
  email: string;
  globalHealthNumber: string | null;
};

export type DuplicateGroup = {
  a: DuplicateSide;
  b: DuplicateSide;
  matchReasons: string[];
};

const REASON_LABEL: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  name_dob: "Name + DOB",
};

function reasonLabels(reasons: string[]) {
  return reasons.map((r) => REASON_LABEL[r] ?? r).join(", ");
}

function groupKey(g: DuplicateGroup) {
  return [g.a.patientProfileId, g.b.patientProfileId].sort().join(":");
}

function fields(): ColumnPriorityField<DuplicateGroup>[] {
  return [
    {
      key: "matched",
      label: "Matched on",
      priority: 1,
      render: (g) => <Pill tone="pending">{reasonLabels(g.matchReasons)}</Pill>,
    },
    {
      key: "a",
      label: "Record A",
      priority: 1,
      render: (g) => (
        <div>
          <div className="font-medium text-[var(--color-text-primary)]">{g.a.fullName ?? "—"}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{g.a.email}</div>
        </div>
      ),
    },
    {
      key: "b",
      label: "Record B",
      priority: 2,
      render: (g) => (
        <div>
          <div className="font-medium text-[var(--color-text-primary)]">{g.b.fullName ?? "—"}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{g.b.email}</div>
        </div>
      ),
    },
  ];
}

function SideCompareCard({
  side,
  selected,
  onSelect,
}: {
  side: DuplicateSide;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="gh-admin-card w-full rounded-md border p-3 text-left"
      style={{
        borderColor: selected ? "var(--portal-primary, #1B4D3E)" : "var(--color-border)",
        borderWidth: selected ? 2 : 1,
      }}
    >
      <div className="text-sm font-semibold text-[var(--color-text-primary)]">
        {side.fullName ?? "—"}
      </div>
      <div className="mt-1 text-xs text-[var(--color-text-muted)]">{side.email}</div>
      <div className="mt-1 text-xs text-[var(--color-text-muted)]">
        GHN: {side.globalHealthNumber ?? "—"}
      </div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: selected ? "var(--portal-primary, #1B4D3E)" : "var(--color-text-muted)" }}>
        {selected ? "Kept as primary" : "Select as primary"}
      </div>
    </button>
  );
}

export function DuplicateGroupsTable({ groups }: { groups: DuplicateGroup[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openGroup, setOpenGroup] = useState<DuplicateGroup | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  function openDialog(g: DuplicateGroup) {
    setOpenGroup(g);
    setPrimaryId(g.a.patientProfileId);
    setReason("");
    setError(null);
    setResultMsg(null);
  }

  function closeDialog() {
    setOpenGroup(null);
  }

  function confirmMerge() {
    if (!openGroup || !primaryId) return;
    const duplicateId =
      primaryId === openGroup.a.patientProfileId ? openGroup.b.patientProfileId : openGroup.a.patientProfileId;
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/patient-merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          primaryPatientId: primaryId,
          duplicatePatientId: duplicateId,
          reason: reason.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Could not merge patients");
        return;
      }
      setResultMsg(json.message ?? "Patients merged successfully");
      setOpenGroup(null);
      router.refresh();
    });
  }

  return (
    <>
      <ColumnPriorityTable<DuplicateGroup>
        fields={fields()}
        rows={groups}
        getRowKey={groupKey}
        // The wrapped first cell is the "matched on" pill, which repeats
        // across groups — on its own it never says WHICH pair the control
        // opens. The label keeps that visible pill text first (WCAG 2.5.3)
        // and adds the two records already rendered in the same row; nothing
        // here is not already on screen.
        getRowAriaLabel={(g) =>
          `${reasonLabels(g.matchReasons)} — ${g.a.fullName ?? g.a.email} and ${g.b.fullName ?? g.b.email}`
        }
        onRowClick={openDialog}
        cardActions={(g) => (
          <button type="button" onClick={() => openDialog(g)} className="gh-btn gh-btn-secondary text-sm">
            Review &amp; merge
            {/* Same reason as `getRowAriaLabel` above: the button text is
                identical on every card, so the pair it opens goes in as
                hidden text after the visible label. */}
            <span className="sr-only">
              {" "}
              — {g.a.fullName ?? g.a.email} and {g.b.fullName ?? g.b.email}
            </span>
          </button>
        )}
      />

      {resultMsg ? (
        <p className="px-4 py-3 text-sm text-[var(--color-status-success-text)]">{resultMsg}</p>
      ) : null}

      <PortalDialog
        open={openGroup !== null}
        onClose={closeDialog}
        title="Merge duplicate patients"
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={closeDialog}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={confirmMerge} disabled={pending}>
              {pending ? "Merging…" : "Merge — keep selected as primary"}
            </Btn>
          </div>
        }
      >
        {openGroup ? (
          <div className="grid gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Matched on {reasonLabels(openGroup.matchReasons)}. Pick which record survives — the other
              is merged into it and marked as merged. This can&rsquo;t be undone.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <SideCompareCard
                side={openGroup.a}
                selected={primaryId === openGroup.a.patientProfileId}
                onSelect={() => setPrimaryId(openGroup.a.patientProfileId)}
              />
              <SideCompareCard
                side={openGroup.b}
                selected={primaryId === openGroup.b.patientProfileId}
                onSelect={() => setPrimaryId(openGroup.b.patientProfileId)}
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Reason (min 10 characters)</span>
              <textarea
                className="gh-input"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Confirmed duplicate — same phone and DOB, patient re-registered"
              />
            </label>
            {error ? <p className="text-sm text-[var(--color-status-error-text)]">{error}</p> : null}
          </div>
        ) : null}
      </PortalDialog>
    </>
  );
}
