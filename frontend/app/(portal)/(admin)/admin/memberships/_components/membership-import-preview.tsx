import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { Pill } from "../../_components/atoms";
import type {
  MembershipImportBatch,
  MembershipImportCounts,
  MembershipImportPreviewRow,
} from "@/lib/admin/memberships-api";

const OUTCOME_LABEL: Record<string, string> = {
  CREATE: "New member",
  LINK: "New member — account exists",
  REVIVE: "Re-adds a removed member",
  REJECT: "Skipped",
};

const OUTCOME_TONE: Record<string, "active" | "brand" | "info" | "inactive"> = {
  CREATE: "brand",
  LINK: "active",
  REVIVE: "info",
  REJECT: "inactive",
};

/**
 * The preview table (§8.2). Reads only the batch's server-side `previewData` —
 * the commit re-reads that same field, so what an admin approves here is
 * exactly what gets applied.
 */
export function MembershipImportPreview({
  batch,
  counts,
}: {
  batch: MembershipImportBatch;
  counts?: MembershipImportCounts | null;
}) {
  const rows = batch.previewData?.rows ?? [];

  const fields: ColumnPriorityField<MembershipImportPreviewRow>[] = [
    {
      key: "line",
      label: "Row",
      priority: 3,
      render: (row) => <span className="font-mono text-portal-compact">{row.line}</span>,
    },
    {
      key: "member",
      label: "Member",
      priority: 1,
      cardPrimary: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {row.firstName} {row.lastName}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">{row.email}</span>
        </div>
      ),
    },
    {
      // The membership ID is generated at commit, so there is nothing to show
      // here yet. What the admin can reconcile against their partner's own
      // spreadsheet is this.
      key: "partnerReference",
      label: "Partner ref",
      priority: 2,
      render: (row) => (
        <span className="font-mono text-portal-compact">
          {row.partnerReference ?? <span className="text-[var(--color-text-muted)]">—</span>}
        </span>
      ),
    },
    {
      key: "outcome",
      label: "What will happen",
      priority: 1,
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Pill tone={OUTCOME_TONE[row.outcome] ?? "inactive"}>
            {OUTCOME_LABEL[row.outcome] ?? row.outcome}
          </Pill>
          {row.reason ? (
            <span className="text-xs text-[var(--color-text-muted)]">{row.reason}</span>
          ) : null}
          {/* Warnings never stop a row, so they read as notes, not errors. */}
          {(row.warnings ?? []).map((warning) => (
            <span key={warning} className="text-xs text-[var(--color-warning-text,#8a6d1f)]">
              {warning}
            </span>
          ))}
          {row.outcome !== "REJECT" && !row.willEmail ? (
            <span className="text-xs text-[var(--color-text-muted)]">
              Already has a card — will not be emailed again
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      priority: 4,
      render: (row) => {
        const primary = row.primaryEmail ?? row.primaryMembershipId;
        return primary ? `Dependent of ${primary}` : "Primary";
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/*
        The blast radius, before the send (§25). This is the entire safety
        argument for previewing rather than emailing on upload: an admin sees
        how many people this reaches while they can still cancel. It is a count
        of EMAILS, not rows — rejected rows send nothing, and a member who
        already has their card is not written to twice.
      */}
      {counts ? (
        <p
          className="gh-portal-note text-sm"
          data-testid="import-recipient-count"
          data-recipients={counts.recipients}
        >
          <strong>
            Committing will email {counts.recipients}{" "}
            {counts.recipients === 1 ? "member" : "members"}
          </strong>{" "}
          a welcome message and their card.
          {counts.reject > 0 ? ` ${counts.reject} skipped row(s) send nothing.` : ""}
          {counts.warned > 0
            ? ` ${counts.warned} row(s) have a note worth reading below.`
            : ""}
        </p>
      ) : null}
      <ColumnPriorityTable
        fields={fields}
        rows={rows}
        getRowKey={(row) => `${row.line}`}
        cardTone={(row) => (row.outcome === "REJECT" ? "neutral" : "success")}
      />
    </div>
  );
}
