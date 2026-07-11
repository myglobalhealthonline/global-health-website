import type { ReactNode } from "react";
import { AdminTable, Thead, Th, Td, Tr } from "@/components/portal-atoms";
import { PortalMobileCard, type PortalMobileCardTone } from "@/components/PortalMobileCard";

export type ColumnPriorityField<T> = {
  key: string;
  label: string;
  /** 1/2 = always visible; 3 hides below 1024px; 4 hides below 1280px
   *  (RESPONSIVE_DESIGN_SYSTEM_PLAN §3.2 config model). */
  priority: 1 | 2 | 3 | 4;
  render: (row: T) => ReactNode;
  /** Field is dropped from the table/card entirely — surfaced only inside
   *  a RecordDetailsDrawer opened from the row (not rendered here). */
  drawerOnly?: boolean;
  /** Field renders in the desktop table only — dropped from the mobile
   *  card's meta list (e.g. an inline multi-button action cell that's
   *  replaced by `cardActions` below 760px, D-04). */
  desktopOnly?: boolean;
  align?: "left" | "right" | "center";
};

/**
 * ColumnPriorityTable — one field config renders BOTH the desktop table
 * (AdminTable/.gh-admin-table) and the PortalMobileCard list, replacing the
 * per-route duplicate table+card markup pattern (RESPONSIVE_DESIGN_SYSTEM_PLAN
 * §3.2). Card mode replaces the table below 760px (matches the existing
 * `.gh-admin-mobile-list` / `@container list (max-width: 960px)` switch in
 * portal.css); priority-3 columns hide <1024px, priority-4 <1280px via the
 * `.gh-cpt-p3` / `.gh-cpt-p4` utility classes added to portal.css.
 */
export function ColumnPriorityTable<T>({
  fields,
  rows,
  getRowKey,
  onRowClick,
  cardTone,
  emptyState,
  cardActions,
}: {
  fields: ColumnPriorityField<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Optional per-row tone for the mobile card's status edge. */
  cardTone?: (row: T) => PortalMobileCardTone;
  emptyState?: ReactNode;
  /** Overrides the mobile card's default trailing "View" button (e.g. a
   *  kebab menu replacing a desktop-only multi-button action cell). */
  cardActions?: (row: T) => ReactNode;
}) {
  const tableFields = fields.filter((f) => !f.drawerOnly);
  const cardFields = tableFields.filter((f) => !f.desktopOnly);
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <>
      <div className="gh-admin-table-wrap gh-cpt-table-wrap">
        <AdminTable>
          <Thead>
            {tableFields.map((f) => (
              <Th
                key={f.key}
                align={f.align}
                className={f.priority >= 3 ? `gh-cpt-p${f.priority}` : undefined}
              >
                {f.label}
              </Th>
            ))}
          </Thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={getRowKey(row)}>
                {tableFields.map((f, i) => (
                  <Td
                    key={f.key}
                    align={f.align}
                    className={f.priority >= 3 ? `gh-cpt-p${f.priority}` : undefined}
                    style={
                      onRowClick && i === 0
                        ? { cursor: "pointer" }
                        : undefined
                    }
                  >
                    <span
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      style={onRowClick ? { cursor: "pointer", display: "block" } : undefined}
                    >
                      {f.render(row)}
                    </span>
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </AdminTable>
      </div>

      <div className="gh-admin-mobile-list gh-cpt-mobile-list">
        {rows.map((row) => {
          const [primary, ...rest] = cardFields;
          return (
            <PortalMobileCard
              key={getRowKey(row)}
              title={primary ? primary.render(row) : null}
              tone={cardTone ? cardTone(row) : "neutral"}
              meta={rest.map((f) => ({ label: f.label, value: f.render(row) }))}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              actions={
                cardActions
                  ? cardActions(row)
                  : onRowClick
                    ? (
                        <button
                          type="button"
                          className="gh-btn gh-btn-soft"
                          onClick={() => onRowClick(row)}
                        >
                          View
                        </button>
                      )
                    : undefined
              }
            />
          );
        })}
      </div>
    </>
  );
}
