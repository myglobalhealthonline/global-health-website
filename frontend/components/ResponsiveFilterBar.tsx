"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AppSheet } from "@/components/AppSheet";

/**
 * ResponsiveFilterBar — recipe wrapper around the canonical
 * `.gh-admin-appointment-filter-grid` collapse pattern (portal.css:1247-1357):
 * grid 4 → 2 → 1 columns, search full-width first row on narrow
 * (RESPONSIVE_DESIGN_SYSTEM_PLAN §5). `search` always renders first/full-width;
 * `children` are the secondary filter controls.
 *
 * `mobileSheet`: below 760px, secondary controls collapse behind a "Filters"
 * trigger (with an active-count badge) that opens them in a bottom AppSheet
 * instead of stacking inline.
 */
export function ResponsiveFilterBar({
  search,
  children,
  mobileSheet = false,
  activeCount = 0,
  className = "",
}: {
  /** Full-width search input, rendered first. */
  search?: ReactNode;
  /** Secondary filter controls. */
  children: ReactNode;
  mobileSheet?: boolean;
  /** Count of active (non-default) filters — shown as a badge on the trigger. */
  activeCount?: number;
  className?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className={`gh-admin-appointment-filter-grid gh-rfb ${className}`.trim()}>
      {search ? <div className="gh-rfb__search">{search}</div> : null}

      {mobileSheet ? (
        <>
          <div className="gh-rfb__desktop-controls">{children}</div>
          <button
            type="button"
            className="gh-rfb__trigger gh-btn gh-btn-soft"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {activeCount > 0 ? (
              <span className="gh-rfb__badge">{activeCount}</span>
            ) : null}
          </button>
          <AppSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            side="bottom"
            size="sm"
            ariaLabel="Filters"
            header={<h2 className="gh-record-drawer__title">Filters</h2>}
            footer={
              <button
                type="button"
                className="gh-btn gh-btn-primary"
                onClick={() => setSheetOpen(false)}
              >
                Show results
              </button>
            }
          >
            <div className="gh-rfb__sheet-controls">{children}</div>
          </AppSheet>
        </>
      ) : (
        children
      )}
    </div>
  );
}
