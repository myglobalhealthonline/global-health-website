import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { Pill } from "../../_components/atoms";
import type {
  MembershipImportBatch,
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
export function MembershipImportPreview({ batch }: { batch: MembershipImportBatch }) {
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
      key: "membershipId",
      label: "Membership ID",
      priority: 2,
      render: (row) => <span className="font-mono text-portal-compact">{row.membershipId}</span>,
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
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      priority: 4,
      render: (row) =>
        row.primaryMembershipId ? `Dependent of ${row.primaryMembershipId}` : "Primary",
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={rows}
      getRowKey={(row) => `${row.line}`}
      cardTone={(row) => (row.outcome === "REJECT" ? "neutral" : "success")}
    />
  );
}
