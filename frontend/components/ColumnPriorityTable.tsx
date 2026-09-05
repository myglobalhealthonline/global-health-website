import { Fragment, type ReactNode } from "react";
import { AdminTable, Thead, Th, Td, Tr } from "@/components/portal-atoms";
import { PortalMobileCard, type PortalMobileCardTone } from "@/components/PortalMobileCard";

export type ColumnPriorityField<T> = {
  key: string;
  /** Desktop-table header. This may be an interactive sortable header. */
  label: ReactNode;
  /** Plain-text label used in the mobile card meta list when `label` is JSX. */
  cardLabel?: string;
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
  /** Selects the primary title rendered in the mobile card. */
  cardPrimary?: boolean;
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
  getRowAriaLabel,
  isRowExpanded,
  cardTone,
  emptyState,
  cardActions,
  renderExpandedRow,
}: {
  fields: ColumnPriorityField<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Overrides the accessible name of the row's click target (native
   *  <button>, see 4a/WCAG 2.1.1+4.1.2 fix). Omit it and the button is named
   *  by the first cell's own visible text — the patient name, email or
   *  reference the sighted user reads. Pass one ONLY where that text is not
   *  identifying on its own (a bare date, say): an aria-label REPLACES the
   *  content as the accessible name, so a label that drops the visible text
   *  fails WCAG 2.2 §2.5.3 Label in Name and makes every row sound alike. */
  getRowAriaLabel?: (row: T) => string;
  /** Pass this ONLY when `onRowClick` toggles a disclosure (an expanded row
   *  or an inline note), and return the caller's existing open state for the
   *  row — this adds `aria-expanded` to the row's control on both surfaces
   *  and introduces no state of its own. Leave it off for a row that opens a
   *  drawer, dialog or page: `aria-expanded` there tells assistive tech the
   *  control reveals adjacent content, which is not what happens. */
  isRowExpanded?: (row: T) => boolean;
  /** Optional per-row tone for the mobile card's status edge. */
  cardTone?: (row: T) => PortalMobileCardTone;
  emptyState?: ReactNode;
  /** Overrides the mobile card's default trailing "View" button (e.g. a
   *  kebab menu replacing a desktop-only multi-button action cell). */
  cardActions?: (row: T) => ReactNode;
  /** Optional second table row for in-place detail. The row data remains in
   *  the caller's existing payload; no drawer/query is introduced. */
  renderExpandedRow?: (row: T, columnCount: number) => ReactNode;
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
              <Fragment key={getRowKey(row)}>
                <Tr>
                  {tableFields.map((f, i) => (
                    <Td
                      key={f.key}
                      align={f.align}
                      className={f.priority >= 3 ? `gh-cpt-p${f.priority}` : undefined}
                    >
                      {onRowClick && i === 0 ? (
                        <button
                          type="button"
                          onClick={() => onRowClick(row)}
                          aria-label={getRowAriaLabel ? getRowAriaLabel(row) : undefined}
                          aria-expanded={isRowExpanded ? isRowExpanded(row) : undefined}
                          className="block w-full cursor-pointer text-left"
                          style={{ background: "none", border: "none", padding: 0, font: "inherit" }}
                        >
                          {f.render(row)}
                        </button>
                      ) : (
                        f.render(row)
                      )}
                    </Td>
                  ))}
                </Tr>
                {renderExpandedRow ? renderExpandedRow(row, tableFields.length) : null}
              </Fragment>
            ))}
          </tbody>
        </AdminTable>
      </div>

      <div className="gh-admin-mobile-list gh-cpt-mobile-list">
        {rows.map((row) => {
          const primaryIndex = cardFields.findIndex((field) => field.cardPrimary);
          const primary = primaryIndex === -1 ? cardFields[0] : cardFields[primaryIndex];
          const rest = cardFields.filter((field) => field !== primary);
          return (
            <PortalMobileCard
              key={getRowKey(row)}
              title={primary ? primary.render(row) : null}
              tone={cardTone ? cardTone(row) : "neutral"}
              meta={rest.map((f) => ({
                label: f.cardLabel ?? (typeof f.label === "string" ? f.label : f.key),
                value: f.render(row),
              }))}
              // No whole-card click handler: the card body holds real
              // controls, so a clickable wrapper around them is invalid
              // structure (see PortalMobileCard). The row action is reached
              // through the explicit button below, or the caller's own
              // `cardActions`.
              actions={
                cardActions
                  ? cardActions(row)
                  : onRowClick
                    ? (
                        <button
                          type="button"
                          className="gh-btn gh-btn-soft"
                          aria-expanded={isRowExpanded ? isRowExpanded(row) : undefined}
                          onClick={() => onRowClick(row)}
                        >
                          View
                          {/* "View" alone repeats on every card in the list.
                              The row label goes in as hidden text rather than
                              an aria-label so the visible word stays part of
                              the accessible name (WCAG 2.2 §2.5.3). */}
                          {getRowAriaLabel ? (
                            <span className="sr-only"> — {getRowAriaLabel(row)}</span>
                          ) : null}
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
